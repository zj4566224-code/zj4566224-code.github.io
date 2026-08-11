"""AI 路由 — NL 记账解析 + 聊天助手(DeepSeek via OpenAI-compatible API)。"""
from __future__ import annotations

import json
from datetime import date as DateType

from fastapi import APIRouter, Depends, HTTPException
from openai import APIStatusError
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models.category import Category
from models.user import User
from schemas.ai import (
    ChatRequest,
    ChatResponse,
    ParseRequest,
    ParsedTransaction,
)
from services.ai import (
    CHAT_TOOLS,
    MODEL,
    MissingAPIKey,
    build_user_context,
    execute_tool,
    get_client,
)

router = APIRouter()


# ─────────────────────────────────────────
# /ai/parse-transaction — NL → 结构化交易草稿
# ─────────────────────────────────────────
# 用 tool_choice 强制调用单一函数,通过 arguments 拿结构化 JSON。
PARSE_TOOL = {
    "type": "function",
    "function": {
        "name": "submit_parsed_transaction",
        "description": "提交解析好的交易草稿。",
        "parameters": {
            "type": "object",
            "properties": {
                "amount": {"type": "number", "description": "金额(正数)"},
                "type": {"type": "string", "enum": ["income", "expense"]},
                "date": {"type": "string", "description": "ISO 日期 YYYY-MM-DD"},
                "category_id": {"type": "integer", "description": "必须来自用户已有分类"},
                "note": {"type": "string", "description": "简短备注"},
                "confidence": {
                    "type": "number",
                    "description": "0-1 自评准确度;0.5 以下表示猜的",
                },
                "interpretation": {
                    "type": "string",
                    "description": "一句话用中文解释你怎么理解这条输入",
                },
            },
            "required": [
                "amount",
                "type",
                "date",
                "category_id",
                "confidence",
                "interpretation",
            ],
        },
    },
}


@router.post("/parse-transaction", response_model=ParsedTransaction)
def parse_transaction(
    payload: ParseRequest,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> ParsedTransaction:
    try:
        client = get_client()
    except MissingAPIKey as e:
        raise HTTPException(status_code=503, detail=str(e))

    user_ctx = build_user_context(db, current)
    today = DateType.today()

    system_content = (
        "你是 FinWise 的智能记账助手。任务是把用户的自然语言转成结构化交易草稿。\n\n"
        "## 必须遵守的规则\n"
        "1. **category_id 必须**从用户已有分类的 id 中选,**绝对不能编造或猜数字**。\n"
        "2. 把'昨天/今天/前天/上周一/上个月25号'等相对时间换成绝对日期(YYYY-MM-DD)。\n"
        "3. 默认 type=expense,除非明显是收入(工资/红包/退款/利息/打款)。\n"
        "4. 选 category 时要看分类的 type 是否匹配(支出/收入)。\n"
        "5. confidence 自评:0.9+ 非常确定;0.5-0.8 大致确定但有歧义;0.5- 在猜。\n"
        "6. interpretation 用一句中文告诉用户你的理解,例如'昨天午餐花了 ¥35,归到「餐饮」'。\n"
        "7. 必须调用 submit_parsed_transaction 函数返回结果。\n\n"
        + user_ctx
    )

    try:
        response = client.chat.completions.create(
            model=MODEL,
            max_tokens=2048,
            messages=[
                {"role": "system", "content": system_content},
                {
                    "role": "user",
                    "content": f"今天是 {today.isoformat()} ({today.strftime('%A')})。\n\n请解析:{payload.text}",
                },
            ],
            tools=[PARSE_TOOL],
            tool_choice={
                "type": "function",
                "function": {"name": "submit_parsed_transaction"},
            },
        )
    except APIStatusError as e:
        raise HTTPException(status_code=502, detail=f"DeepSeek API 错误: {e.message}")

    msg = response.choices[0].message
    if not msg.tool_calls:
        raise HTTPException(status_code=502, detail="AI 没能产出结构化结果,请换种说法")

    try:
        args = json.loads(msg.tool_calls[0].function.arguments)
        parsed = ParsedTransaction.model_validate(args)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI 返回的数据不合规: {e}")

    # 校验 category_id 归属当前用户(防止 LLM 编造或越权)
    cat = (
        db.query(Category)
        .filter(Category.id == parsed.category_id, Category.user_id == current.id)
        .first()
    )
    if not cat:
        raise HTTPException(
            status_code=422,
            detail="AI 选择的分类不存在,请手动选分类后再添加",
        )
    if cat.type in ("income", "expense") and cat.type != parsed.type:
        parsed.type = cat.type

    return parsed


# ─────────────────────────────────────────
# /ai/chat — Tool-use 聊天助手
# ─────────────────────────────────────────
MAX_TOOL_ITERATIONS = 5


@router.post("/chat", response_model=ChatResponse)
def chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> ChatResponse:
    try:
        client = get_client()
    except MissingAPIKey as e:
        raise HTTPException(status_code=503, detail=str(e))

    user_ctx = build_user_context(db, current)
    today = DateType.today()

    system_content = (
        "你是 FinWise 的财务助手,帮助用户理解和分析自己的财务。\n\n"
        "## 行为准则\n"
        "1. **必要时调用工具获取真实数据**,不要凭空猜测金额或分类。\n"
        "2. 回复用中文,温和但简练 — 通常 2-5 句话,不要冗长。\n"
        "3. 数据多时只给最重要的洞察(top 3),不要罗列每一条。\n"
        "4. 金额带 ¥ 符号。\n"
        "5. 如果用户问到自己以外的人或非财务问题,礼貌拒答并提示能问什么。\n"
        "6. 当前用户的分类和账户在下面,**仅限**这位用户的数据可访问。\n\n"
        + user_ctx
    )

    messages: list[dict] = [{"role": "system", "content": system_content}]
    for h in payload.history[-10:]:  # 最近 10 条历史
        messages.append({"role": h.role, "content": h.content})
    messages.append(
        {
            "role": "user",
            "content": f"(今天是 {today.isoformat()})\n{payload.message}",
        }
    )

    tools_used: list[str] = []
    response = None

    for _ in range(MAX_TOOL_ITERATIONS):
        try:
            response = client.chat.completions.create(
                model=MODEL,
                max_tokens=2048,
                messages=messages,
                tools=CHAT_TOOLS,
            )
        except APIStatusError as e:
            raise HTTPException(status_code=502, detail=f"DeepSeek API 错误: {e.message}")

        msg = response.choices[0].message
        finish = response.choices[0].finish_reason

        # 把 assistant 这一轮的消息(可能含 tool_calls)塞回历史
        assistant_msg: dict = {"role": "assistant", "content": msg.content or ""}
        if msg.tool_calls:
            assistant_msg["tool_calls"] = [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {
                        "name": tc.function.name,
                        "arguments": tc.function.arguments,
                    },
                }
                for tc in msg.tool_calls
            ]
        messages.append(assistant_msg)

        if finish != "tool_calls" or not msg.tool_calls:
            break

        for tc in msg.tool_calls:
            tools_used.append(tc.function.name)
            try:
                args = json.loads(tc.function.arguments or "{}")
            except json.JSONDecodeError:
                args = {}
            result_str = execute_tool(db, current, tc.function.name, args)
            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": result_str,
                }
            )

    final_text = ""
    if response is not None:
        final_text = (response.choices[0].message.content or "").strip()
    if not final_text:
        final_text = "(我没拿到结果,换种问法试试?)"

    return ChatResponse(reply=final_text, tool_calls=tools_used)

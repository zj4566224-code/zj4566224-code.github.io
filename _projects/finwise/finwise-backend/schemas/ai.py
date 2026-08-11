from datetime import date as DateType
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field


# ─── 自然语言记账 ────────────────────────
class ParseRequest(BaseModel):
    text: str = Field(min_length=1, max_length=500)


class ParsedTransaction(BaseModel):
    """LLM 解析后的结构化交易草稿。"""
    amount: Decimal = Field(gt=0, description="金额,必须正数")
    type: Literal["income", "expense"]
    date: DateType
    category_id: int = Field(description="必须从用户已有分类的 id 中选")
    note: str = ""
    confidence: float = Field(ge=0, le=1, description="0-1 自评准确度")
    interpretation: str = Field(default="", description="一句话解释 LLM 的理解,供用户确认")


# ─── 聊天助手 ────────────────────────────
class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    history: list[ChatMessage] = Field(default_factory=list)


class ChatResponse(BaseModel):
    reply: str
    tool_calls: list[str] = Field(default_factory=list)

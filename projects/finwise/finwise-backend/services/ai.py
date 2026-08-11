"""LLM 集成 — 通过 OpenAI 兼容协议对接 DeepSeek。

设计:
- 系统提示 + 用户上下文(分类/账户/姓名)拼成单条 system message
- 工具用 OpenAI function calling 格式
- 工具函数都接受 (db, user) 显式参数,严格按 user_id 过滤,杜绝跨用户泄露
"""
from __future__ import annotations

import calendar
import json
import os
from datetime import date as DateType
from decimal import Decimal

from openai import OpenAI
from sqlalchemy import func
from sqlalchemy.orm import Session

from models.account import Account
from models.budget import Budget
from models.category import Category
from models.goal import Goal
from models.transaction import Transaction
from models.user import User

MODEL = "deepseek-chat"
BASE_URL = "https://api.deepseek.com"

_client: OpenAI | None = None


class MissingAPIKey(Exception):
    pass


def get_client() -> OpenAI:
    """懒加载。未设置 DEEPSEEK_API_KEY 时抛 MissingAPIKey 让 router 处理。"""
    global _client
    if _client is None:
        key = os.getenv("DEEPSEEK_API_KEY")
        if not key:
            raise MissingAPIKey("DEEPSEEK_API_KEY 未配置,无法使用 AI 功能")
        _client = OpenAI(api_key=key, base_url=BASE_URL)
    return _client


# ─────────────────────────────────────────
# 用户上下文 — 进 system message
# ─────────────────────────────────────────
def build_user_context(db: Session, user: User) -> str:
    cats = (
        db.query(Category)
        .filter(Category.user_id == user.id)
        .order_by(Category.id)
        .all()
    )
    accs = (
        db.query(Account)
        .filter(Account.user_id == user.id)
        .order_by(Account.id)
        .all()
    )

    cat_lines = [
        f"  - id={c.id} type={c.type} name={c.name} icon={c.icon or ''}" for c in cats
    ]
    acc_lines = [
        f"  - id={a.id} name={a.name} type={a.type} balance={a.balance}" for a in accs
    ]

    return (
        f"## 当前用户档案\n"
        f"- 姓名: {user.name or user.email}\n"
        f"- 主币种: {user.currency or 'CNY'}\n"
        f"\n"
        f"## 该用户的分类(从这里选 category_id,**不能**编造)\n"
        + "\n".join(cat_lines)
        + f"\n\n## 该用户的账户\n"
        + "\n".join(acc_lines)
    )


# ─────────────────────────────────────────
# 工具函数 — 严格按 user_id 过滤
# ─────────────────────────────────────────
def _month_bounds(month: str) -> tuple[DateType, DateType]:
    y, m = map(int, month.split("-"))
    start = DateType(y, m, 1)
    end = DateType(y + (1 if m == 12 else 0), 1 if m == 12 else m + 1, 1)
    return start, end


def _month_offset(year: int, month: int, offset: int) -> str:
    """Walk `offset` months from (year, month). Negative = past."""
    total = year * 12 + (month - 1) + offset
    return f"{total // 12}-{(total % 12) + 1:02d}"


def tool_get_summary(db: Session, user: User, month: str) -> str:
    start, end = _month_bounds(month)
    base = (
        db.query(Transaction)
        .join(Account, Account.id == Transaction.account_id)
        .filter(
            Account.user_id == user.id,
            Transaction.date >= start,
            Transaction.date < end,
        )
    )
    income = base.filter(Transaction.type == "income").with_entities(
        func.coalesce(func.sum(Transaction.amount), 0)
    ).scalar() or Decimal("0")
    expense = base.filter(Transaction.type == "expense").with_entities(
        func.coalesce(func.sum(Transaction.amount), 0)
    ).scalar() or Decimal("0")

    by_cat = (
        base.filter(Transaction.type == "expense")
        .join(Category, Category.id == Transaction.category_id)
        .with_entities(Category.name, func.sum(Transaction.amount))
        .group_by(Category.name)
        .order_by(func.sum(Transaction.amount).desc())
        .all()
    )

    return json.dumps(
        {
            "month": month,
            "income": float(income),
            "expense": float(expense),
            "net": float(income - expense),
            "by_category": [{"name": n, "amount": float(a)} for n, a in by_cat],
        },
        ensure_ascii=False,
    )


def tool_list_transactions(
    db: Session,
    user: User,
    month: str | None = None,
    category_name: str | None = None,
    type: str | None = None,
    limit: int = 20,
) -> str:
    q = (
        db.query(Transaction, Category.name, Account.name)
        .join(Account, Account.id == Transaction.account_id)
        .join(Category, Category.id == Transaction.category_id)
        .filter(Account.user_id == user.id)
    )
    if month:
        s, e = _month_bounds(month)
        q = q.filter(Transaction.date >= s, Transaction.date < e)
    if category_name:
        q = q.filter(Category.name == category_name)
    if type in ("income", "expense"):
        q = q.filter(Transaction.type == type)
    rows = q.order_by(Transaction.date.desc(), Transaction.id.desc()).limit(min(limit, 50)).all()

    out = [
        {
            "date": t.date.isoformat(),
            "amount": float(t.amount),
            "type": t.type,
            "category": cat_name,
            "account": acc_name,
            "note": t.note or "",
        }
        for t, cat_name, acc_name in rows
    ]
    return json.dumps({"count": len(out), "items": out}, ensure_ascii=False)


def tool_get_budgets(db: Session, user: User) -> str:
    today = DateType.today()
    start, end = _month_bounds(f"{today.year}-{today.month:02d}")

    items = db.query(Budget).filter(Budget.user_id == user.id).all()
    by_cat = dict(
        db.query(Transaction.category_id, func.sum(Transaction.amount))
        .join(Account, Account.id == Transaction.account_id)
        .filter(
            Account.user_id == user.id,
            Transaction.type == "expense",
            Transaction.date >= start,
            Transaction.date < end,
        )
        .group_by(Transaction.category_id)
        .all()
    )
    total_spent = sum((Decimal(v) for v in by_cat.values()), Decimal("0"))

    out = []
    for b in items:
        cat = (
            db.query(Category).filter(Category.id == b.category_id).first()
            if b.category_id
            else None
        )
        spent = total_spent if b.category_id is None else by_cat.get(b.category_id, Decimal("0"))
        out.append(
            {
                "category": cat.name if cat else "总预算",
                "amount": float(b.amount),
                "spent": float(spent),
                "remaining": float(Decimal(b.amount) - Decimal(spent)),
                "period": b.period,
            }
        )
    return json.dumps({"budgets": out}, ensure_ascii=False)


def tool_get_accounts(db: Session, user: User) -> str:
    accs = db.query(Account).filter(Account.user_id == user.id).all()
    out = [
        {"name": a.name, "type": a.type, "balance": float(a.balance or 0), "color": a.color}
        for a in accs
    ]
    total = sum(a["balance"] for a in out)
    return json.dumps({"total_balance": total, "accounts": out}, ensure_ascii=False)


def tool_compare_months(db: Session, user: User, month_a: str, month_b: str) -> str:
    """Compare two months side-by-side with top category deltas."""
    def m_data(month: str) -> dict:
        s, e = _month_bounds(month)
        base = (
            db.query(Transaction)
            .join(Account, Account.id == Transaction.account_id)
            .filter(
                Account.user_id == user.id,
                Transaction.date >= s,
                Transaction.date < e,
            )
        )
        income = base.filter(Transaction.type == "income").with_entities(
            func.coalesce(func.sum(Transaction.amount), 0)
        ).scalar() or Decimal("0")
        expense = base.filter(Transaction.type == "expense").with_entities(
            func.coalesce(func.sum(Transaction.amount), 0)
        ).scalar() or Decimal("0")
        by_cat = dict(
            base.filter(Transaction.type == "expense")
            .join(Category, Category.id == Transaction.category_id)
            .with_entities(Category.name, func.sum(Transaction.amount))
            .group_by(Category.name)
            .all()
        )
        return {
            "income": float(income),
            "expense": float(expense),
            "by_cat": {k: float(v) for k, v in by_cat.items()},
        }

    a = m_data(month_a)
    b = m_data(month_b)
    cat_keys = set(a["by_cat"]) | set(b["by_cat"])
    cat_changes = sorted(
        [
            {
                "category": k,
                "month_a": a["by_cat"].get(k, 0),
                "month_b": b["by_cat"].get(k, 0),
                "delta": b["by_cat"].get(k, 0) - a["by_cat"].get(k, 0),
            }
            for k in cat_keys
        ],
        key=lambda x: abs(x["delta"]),
        reverse=True,
    )[:8]

    return json.dumps(
        {
            "month_a": {"month": month_a, "income": a["income"], "expense": a["expense"]},
            "month_b": {"month": month_b, "income": b["income"], "expense": b["expense"]},
            "income_delta": b["income"] - a["income"],
            "expense_delta": b["expense"] - a["expense"],
            "expense_pct_change": (
                round((b["expense"] - a["expense"]) / a["expense"] * 100, 1)
                if a["expense"] > 0
                else None
            ),
            "category_changes": cat_changes,
        },
        ensure_ascii=False,
    )


def tool_get_trend(db: Session, user: User, months: int = 6) -> str:
    """N-month time series of income/expense/net, oldest first."""
    months = max(1, min(months, 24))
    today = DateType.today()
    out = []
    for i in range(months - 1, -1, -1):
        month_str = _month_offset(today.year, today.month, -i)
        s, e = _month_bounds(month_str)
        base = (
            db.query(Transaction)
            .join(Account, Account.id == Transaction.account_id)
            .filter(
                Account.user_id == user.id,
                Transaction.date >= s,
                Transaction.date < e,
            )
        )
        income = base.filter(Transaction.type == "income").with_entities(
            func.coalesce(func.sum(Transaction.amount), 0)
        ).scalar() or Decimal("0")
        expense = base.filter(Transaction.type == "expense").with_entities(
            func.coalesce(func.sum(Transaction.amount), 0)
        ).scalar() or Decimal("0")
        out.append(
            {
                "month": month_str,
                "income": float(income),
                "expense": float(expense),
                "net": float(income - expense),
            }
        )
    return json.dumps({"months": out}, ensure_ascii=False)


def tool_predict_overrun(db: Session, user: User) -> str:
    """Project each budget to month-end based on current burn rate."""
    today = DateType.today()
    days_in_month = calendar.monthrange(today.year, today.month)[1]
    pct_elapsed = today.day / days_in_month

    start, end = _month_bounds(f"{today.year}-{today.month:02d}")
    items = db.query(Budget).filter(Budget.user_id == user.id).all()
    by_cat = dict(
        db.query(Transaction.category_id, func.sum(Transaction.amount))
        .join(Account, Account.id == Transaction.account_id)
        .filter(
            Account.user_id == user.id,
            Transaction.type == "expense",
            Transaction.date >= start,
            Transaction.date < end,
        )
        .group_by(Transaction.category_id)
        .all()
    )
    total_spent = sum((Decimal(v) for v in by_cat.values()), Decimal("0"))

    predictions = []
    for b in items:
        cat = (
            db.query(Category).filter(Category.id == b.category_id).first()
            if b.category_id
            else None
        )
        spent = total_spent if b.category_id is None else by_cat.get(b.category_id, Decimal("0"))
        spent_f = float(spent)
        budget_f = float(b.amount)
        projected = spent_f / pct_elapsed if pct_elapsed > 0 else 0
        predictions.append(
            {
                "category": cat.name if cat else "总预算",
                "budget": budget_f,
                "spent_so_far": spent_f,
                "pct_used": round((spent_f / budget_f * 100), 1) if budget_f else 0,
                "projected_month_end": round(projected, 2),
                "will_exceed": projected > budget_f,
                "projected_overage": round(max(0, projected - budget_f), 2),
            }
        )
    predictions.sort(key=lambda x: x["pct_used"], reverse=True)

    return json.dumps(
        {
            "today": today.isoformat(),
            "days_in_month": days_in_month,
            "pct_month_elapsed": round(pct_elapsed * 100, 1),
            "predictions": predictions,
        },
        ensure_ascii=False,
    )


def tool_find_anomalies(
    db: Session, user: User, month: str | None = None, top_n: int = 10
) -> str:
    """Top expenses in a month + ratio to that category's 6-month historical average."""
    today = DateType.today()
    if not month:
        month = f"{today.year}-{today.month:02d}"
    s, e = _month_bounds(month)
    six_months_back = _month_offset(s.year, s.month, -6)
    bs, _ = _month_bounds(six_months_back)

    avg_by_cat = dict(
        db.query(Transaction.category_id, func.avg(Transaction.amount))
        .join(Account, Account.id == Transaction.account_id)
        .filter(
            Account.user_id == user.id,
            Transaction.type == "expense",
            Transaction.date >= bs,
            Transaction.date < s,
        )
        .group_by(Transaction.category_id)
        .all()
    )

    rows = (
        db.query(Transaction, Category.name)
        .join(Account, Account.id == Transaction.account_id)
        .join(Category, Category.id == Transaction.category_id)
        .filter(
            Account.user_id == user.id,
            Transaction.date >= s,
            Transaction.date < e,
            Transaction.type == "expense",
        )
        .order_by(Transaction.amount.desc())
        .limit(min(top_n, 30))
        .all()
    )

    out = []
    for t, cat_name in rows:
        avg = avg_by_cat.get(t.category_id)
        ratio = float(t.amount) / float(avg) if avg and avg > 0 else None
        out.append(
            {
                "date": t.date.isoformat(),
                "amount": float(t.amount),
                "category": cat_name,
                "note": t.note or "",
                "category_avg_prev_6mo": round(float(avg), 2) if avg else None,
                "ratio_to_avg": round(ratio, 2) if ratio else None,
                "is_anomaly": ratio is not None and ratio > 2.0,
            }
        )
    return json.dumps({"month": month, "top_transactions": out}, ensure_ascii=False)


def tool_category_trend(
    db: Session, user: User, category_name: str, months: int = 6
) -> str:
    """Per-month total and count for a single category, oldest first."""
    months = max(1, min(months, 24))
    today = DateType.today()
    cat = (
        db.query(Category)
        .filter(Category.user_id == user.id, Category.name == category_name)
        .first()
    )
    if not cat:
        return json.dumps(
            {"error": f"分类 '{category_name}' 不存在"}, ensure_ascii=False
        )

    out = []
    for i in range(months - 1, -1, -1):
        month_str = _month_offset(today.year, today.month, -i)
        s, e = _month_bounds(month_str)
        total, count = (
            db.query(
                func.coalesce(func.sum(Transaction.amount), 0),
                func.count(Transaction.id),
            )
            .join(Account, Account.id == Transaction.account_id)
            .filter(
                Account.user_id == user.id,
                Transaction.category_id == cat.id,
                Transaction.date >= s,
                Transaction.date < e,
            )
            .first()
        )
        out.append({"month": month_str, "total": float(total or 0), "count": count or 0})

    return json.dumps(
        {"category": category_name, "trend": out}, ensure_ascii=False
    )


def tool_get_goals(db: Session, user: User) -> str:
    goals = db.query(Goal).filter(Goal.user_id == user.id).all()
    out = [
        {
            "name": g.name,
            "target": float(g.target_amount),
            "current": float(g.current_amount or 0),
            "progress_pct": (float(g.current_amount or 0) / float(g.target_amount) * 100)
            if g.target_amount
            else 0,
            "deadline": g.deadline.isoformat() if g.deadline else None,
            "status": g.status,
        }
        for g in goals
    ]
    return json.dumps({"goals": out}, ensure_ascii=False)


# ─────────────────────────────────────────
# OpenAI function-calling 格式的工具声明
# ─────────────────────────────────────────
CHAT_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_summary",
            "description": "获取指定月份的收支汇总,包含总收入、总支出、净额、按分类细分。用于回答 '这个月花了多少'、'上个月收入多少' 类问题。",
            "parameters": {
                "type": "object",
                "properties": {
                    "month": {
                        "type": "string",
                        "description": "月份,格式 YYYY-MM,例如 2026-05",
                    }
                },
                "required": ["month"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_transactions",
            "description": "列出符合条件的交易记录。用于回答 '上次咖啡花了多少'、'最近几笔大额支出' 等具体问题。",
            "parameters": {
                "type": "object",
                "properties": {
                    "month": {"type": "string", "description": "可选,月份 YYYY-MM"},
                    "category_name": {"type": "string", "description": "可选,分类名,如 '餐饮'"},
                    "type": {
                        "type": "string",
                        "enum": ["income", "expense"],
                        "description": "可选,收入或支出",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "返回条数 1-50,默认 20",
                    },
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_budgets",
            "description": "获取所有预算的当前执行情况,含每个预算已花、剩余、超额标记。",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_accounts",
            "description": "获取所有账户的当前余额。",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_goals",
            "description": "获取所有储蓄目标及当前进度百分比。",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compare_months",
            "description": "对比两个月份的收支细节,返回各项变化与按分类的差异 top 8。用于 '本月 vs 上月怎么变了'、'去年同月对比' 类问题。",
            "parameters": {
                "type": "object",
                "properties": {
                    "month_a": {"type": "string", "description": "基准月份 YYYY-MM"},
                    "month_b": {"type": "string", "description": "对比月份 YYYY-MM"},
                },
                "required": ["month_a", "month_b"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_trend",
            "description": "获取近 N 个月的收入/支出/净额时间序列,从旧到新排列。用于 '最近半年的趋势'、'最近一年走势' 类问题。",
            "parameters": {
                "type": "object",
                "properties": {
                    "months": {"type": "integer", "description": "返回月数 1-24,默认 6"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "predict_overrun",
            "description": "基于本月当前消费速度,线性外推每个预算到月底的预计总支出,并标记将超支的项。用于 '我哪个预算会爆'、'本月会超多少' 类问题。",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "find_anomalies",
            "description": "找出指定月份金额最大的支出,并标记相对该分类前 6 个月均值的异常倍数(>2x 视为异常)。用于 '本月有什么大额异常'、'哪笔花销不寻常' 类问题。",
            "parameters": {
                "type": "object",
                "properties": {
                    "month": {"type": "string", "description": "可选,YYYY-MM,默认本月"},
                    "top_n": {"type": "integer", "description": "返回前 N 笔,默认 10,上限 30"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "category_trend",
            "description": "追踪单个分类在过去 N 个月的总支出和笔数走势。用于 '我餐饮花销变化'、'交通费有没有上升' 类问题。",
            "parameters": {
                "type": "object",
                "properties": {
                    "category_name": {"type": "string", "description": "分类名,如 '餐饮'"},
                    "months": {"type": "integer", "description": "月数 1-24,默认 6"},
                },
                "required": ["category_name"],
            },
        },
    },
]


def execute_tool(db: Session, user: User, name: str, args: dict) -> str:
    """统一分发。所有工具都按 user_id 隔离。"""
    try:
        if name == "get_summary":
            return tool_get_summary(db, user, **args)
        if name == "list_transactions":
            return tool_list_transactions(db, user, **args)
        if name == "get_budgets":
            return tool_get_budgets(db, user)
        if name == "get_accounts":
            return tool_get_accounts(db, user)
        if name == "get_goals":
            return tool_get_goals(db, user)
        if name == "compare_months":
            return tool_compare_months(db, user, **args)
        if name == "get_trend":
            return tool_get_trend(db, user, **args)
        if name == "predict_overrun":
            return tool_predict_overrun(db, user)
        if name == "find_anomalies":
            return tool_find_anomalies(db, user, **args)
        if name == "category_trend":
            return tool_category_trend(db, user, **args)
        return json.dumps({"error": f"unknown tool {name}"})
    except Exception as e:
        return json.dumps({"error": str(e)}, ensure_ascii=False)

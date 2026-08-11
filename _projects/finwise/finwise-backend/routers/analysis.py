from datetime import date as DateType, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models.account import Account
from models.asset import Asset
from models.budget import Budget
from models.category import Category
from models.goal import Goal
from models.liability import Liability
from models.transaction import Transaction
from models.user import User
from schemas.analysis import (
    AccountRunway,
    AnalysisReport,
    CashflowResponse,
    DayOfWeekBucket,
    ForecastData,
    HealthScore,
    HealthScoreBreakdown,
    InsightsResponse,
    MonthlyData,
    SmallTxTrend,
    Suggestion,
    TopCategorySkew,
    WeekdayWeekend,
)
from services.r_engine import run_r_script

router = APIRouter()


# ---------- 数据准备 ----------

def _month_str(d: DateType) -> str:
    return f"{d.year:04d}-{d.month:02d}"


def _last_n_months(n: int = 6) -> list[tuple[DateType, DateType]]:
    today = DateType.today()
    months: list[tuple[DateType, DateType]] = []
    y, m = today.year, today.month
    for _ in range(n):
        start = DateType(y, m, 1)
        if m == 12:
            end = DateType(y + 1, 1, 1)
        else:
            end = DateType(y, m + 1, 1)
        months.append((start, end))
        m -= 1
        if m == 0:
            m = 12
            y -= 1
    return list(reversed(months))


def _monthly_data(db: Session, user_id: int) -> list[MonthlyData]:
    """一次 SQL 拉近 6 个月的收支汇总,按月+类型 group by。"""
    months = _last_n_months(6)
    if not months:
        return []
    overall_start = months[0][0]
    overall_end = months[-1][1]

    month_expr = func.date_trunc("month", Transaction.date)
    rows = (
        db.query(month_expr.label("m"), Transaction.type, func.sum(Transaction.amount))
        .join(Account, Account.id == Transaction.account_id)
        .filter(
            Account.user_id == user_id,
            Transaction.date >= overall_start,
            Transaction.date < overall_end,
        )
        .group_by("m", Transaction.type)
        .all()
    )

    bucket: dict[str, dict[str, float]] = {}
    for m, t, total in rows:
        # date_trunc 在 PG 上返回 datetime,统一成 YYYY-MM
        key = f"{m.year:04d}-{m.month:02d}"
        bucket.setdefault(key, {})[t] = float(total)

    out: list[MonthlyData] = []
    for start, _end in months:
        key = _month_str(start)
        totals = bucket.get(key, {})
        income = totals.get("income", 0.0)
        expense = totals.get("expense", 0.0)
        out.append(
            MonthlyData(
                month=key,
                income=income,
                expense=expense,
                savings=income - expense,
            )
        )
    return out


def _build_context(db: Session, user_id: int, monthly: list[MonthlyData]) -> dict:
    current = monthly[-1] if monthly else MonthlyData(month="", income=0, expense=0, savings=0)

    savings_rate = (current.savings / current.income) if current.income > 0 else 0.0

      # 预算: 一次性算所有分类的本月支出,避免每个预算一次查询
    budgets = db.query(Budget).filter(Budget.user_id == user_id).all()
    today = DateType.today()
    month_start = DateType(today.year, today.month, 1)
    month_end = (
        DateType(today.year + 1, 1, 1)
        if today.month == 12
        else DateType(today.year, today.month + 1, 1)
    )

    spent_by_cat_rows = (
        db.query(Transaction.category_id, func.sum(Transaction.amount))
        .join(Account, Account.id == Transaction.account_id)
        .filter(
            Account.user_id == user_id,
            Transaction.type == "expense",
            Transaction.date >= month_start,
            Transaction.date < month_end,
        )
        .group_by(Transaction.category_id)
        .all()
    )
    spent_by_cat: dict[int, Decimal] = {cid: Decimal(s) for cid, s in spent_by_cat_rows}
    grand_total_spent = sum(spent_by_cat.values(), Decimal("0"))

    overspent_cat_id: int | None = None
    total_budget = Decimal("0")
    total_spent = Decimal("0")
    for b in budgets:
        amount = Decimal(b.amount)
        total_budget += amount
        spent = grand_total_spent if b.category_id is None else spent_by_cat.get(b.category_id, Decimal("0"))
        total_spent += spent
        if b.category_id is not None and spent > amount and overspent_cat_id is None:
            overspent_cat_id = b.category_id

    overspent_name = ""
    if overspent_cat_id is not None:
        cat = db.query(Category).filter(Category.id == overspent_cat_id).first()
        if cat:
            overspent_name = cat.name

    budget_usage_rate = float(total_spent / total_budget) if total_budget > 0 else 0.0
    budget_overspent = max(0, int((total_spent - total_budget) // 100)) if total_budget > 0 else 0

    # 资产负债
    total_assets = (
        db.query(func.coalesce(func.sum(Asset.value), 0))
        .filter(Asset.user_id == user_id)
        .scalar()
        or 0
    )
    total_liabilities = (
        db.query(func.coalesce(func.sum(Liability.remaining), 0))
        .filter(Liability.user_id == user_id)
        .scalar()
        or 0
    )
    debt_ratio = (
        float(Decimal(total_liabilities) / Decimal(total_assets))
        if Decimal(total_assets) > 0
        else 0.0
    )

    # 目标
    goals = db.query(Goal).filter(Goal.user_id == user_id, Goal.status == "active").all()
    if goals:
        progresses = [
            min(1.0, float(g.current_amount or 0) / float(g.target_amount))
            for g in goals
            if float(g.target_amount) > 0
        ]
        avg_goal = sum(progresses) / len(progresses) if progresses else 0.0
    else:
        avg_goal = 0.0

    return {
        "savings_rate": round(savings_rate, 4),
        "budget_overspent": budget_overspent,
        "budget_usage_rate": round(budget_usage_rate, 4),
        "debt_ratio": round(debt_ratio, 4),
        "avg_goal_progress": round(avg_goal, 4),
        "overspent_category": overspent_name,
    }


# ---------- 降级实现:R 不可用时仍能给出结果 ----------

def _py_health(ctx: dict) -> HealthScore:
    savings = min(100, max(0, round(ctx["savings_rate"] * 300)))
    if ctx["budget_overspent"] > 0:
        budget = max(0, round(100 - ctx["budget_overspent"] * 20))
    else:
        budget = min(100, max(0, round(100 - abs(ctx["budget_usage_rate"] - 0.8) * 50)))
    debt = min(100, max(0, round((1 - min(1, ctx["debt_ratio"] / 0.3)) * 100)))
    goal = min(100, max(0, round(ctx["avg_goal_progress"] * 100)))
    total = round((savings + budget + debt + goal) / 4)
    return HealthScore(
        total=total,
        breakdown=HealthScoreBreakdown(
            savings_rate=savings, budget_control=budget, debt_ratio=debt, goal_progress=goal
        ),
    )


def _py_suggestions(ctx: dict) -> list[Suggestion]:
    out: list[Suggestion] = []
    sr = ctx["savings_rate"]
    if sr < 0.2:
        out.append(Suggestion(level="warn", text=f"本月储蓄率仅 {round(sr * 100)}%,低于建议的 20%,请检查非必要支出。"))
    else:
        out.append(Suggestion(level="ok", text=f"储蓄率达 {round(sr * 100)}%,高于建议的 20%,财务状况良好。"))
    if ctx["overspent_category"]:
        out.append(Suggestion(level="warn", text=f"{ctx['overspent_category']} 支出已超出预算,请注意控制该分类消费。"))
    if ctx["avg_goal_progress"] < 0.5:
        out.append(Suggestion(level="tip", text="当前目标完成进度偏低,建议增加每月存入金额。"))
    if ctx["debt_ratio"] > 0.5:
        out.append(Suggestion(level="warn", text=f"负债占资产比已达 {round(ctx['debt_ratio'] * 100)}%,建议优先偿还高息负债。"))
    return out


def _py_forecast(monthly_savings: list[float]) -> list[float]:
    n = len(monthly_savings)
    if n < 2:
        base = monthly_savings[0] if n == 1 else 0.0
        return [round(max(0.0, base), 2)] * 6
    xs = list(range(1, n + 1))
    mean_x = sum(xs) / n
    mean_y = sum(monthly_savings) / n
    num = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, monthly_savings))
    den = sum((x - mean_x) ** 2 for x in xs)
    slope = num / den if den else 0.0
    intercept = mean_y - slope * mean_x
    out = []
    for i in range(n + 1, n + 7):
        out.append(round(max(0.0, slope * i + intercept), 2))
    return out


def _future_month_labels(n: int = 6) -> list[str]:
    today = DateType.today()
    y, m = today.year, today.month
    out: list[str] = []
    for _ in range(n):
        m += 1
        if m == 13:
            m = 1
            y += 1
        out.append(f"{y:04d}-{m:02d}")
    return out


# ---------- 端点 ----------

@router.get("/monthly", response_model=list[MonthlyData])
def monthly(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[MonthlyData]:
    return _monthly_data(db, current.id)


@router.get("/health-score", response_model=HealthScore)
def health_score_endpoint(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> HealthScore:
    monthly = _monthly_data(db, current.id)
    ctx = _build_context(db, current.id, monthly)
    r_result = run_r_script("health_score.R", ctx)
    if r_result:
        return HealthScore(
            total=int(r_result["total"]),
            breakdown=HealthScoreBreakdown(
                savings_rate=int(r_result["savings_rate"]),
                budget_control=int(r_result["budget_control"]),
                debt_ratio=int(r_result["debt_ratio"]),
                goal_progress=int(r_result["goal_progress"]),
            ),
        )
    return _py_health(ctx)


@router.get("/suggestions", response_model=list[Suggestion])
def suggestions_endpoint(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[Suggestion]:
    monthly = _monthly_data(db, current.id)
    ctx = _build_context(db, current.id, monthly)
    r_result = run_r_script("suggestions.R", ctx)
    if isinstance(r_result, list):
        return [Suggestion(**item) for item in r_result]
    return _py_suggestions(ctx)


@router.get("/forecast", response_model=list[ForecastData])
def forecast_endpoint(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[ForecastData]:
    monthly = _monthly_data(db, current.id)
    savings = [m.savings for m in monthly]
    r_result = run_r_script("forecast.R", {"monthly_savings": savings})
    predicted: list[float]
    if r_result and "predicted" in r_result:
        predicted = [float(v) for v in r_result["predicted"]]
    else:
        predicted = _py_forecast(savings)

    labels = _future_month_labels(6)
    return [
        ForecastData(month=labels[i], predicted=predicted[i], is_actual=False)
        for i in range(min(6, len(predicted)))
    ]


# ─────────────────────────────────────────
# 行为洞察 + 现金流预警
# ─────────────────────────────────────────
DAY_LABELS_ZH = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
SMALL_TX_THRESHOLD = Decimal("50")
INSIGHTS_WINDOW_DAYS = 90
BURN_WINDOW_DAYS = 30


def _month_window(months_ago: int = 0) -> tuple[DateType, DateType]:
    today = DateType.today()
    y, m = today.year, today.month - months_ago
    while m <= 0:
        m += 12
        y -= 1
    start = DateType(y, m, 1)
    end = DateType(y + (1 if m == 12 else 0), 1 if m == 12 else m + 1, 1)
    return start, end


@router.get("/insights", response_model=InsightsResponse)
def insights_endpoint(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> InsightsResponse:
    """行为模式洞察:工作日/周末、星期分布、小额交易趋势、头部分类的日偏好。"""
    today = DateType.today()
    window_start = today - timedelta(days=INSIGHTS_WINDOW_DAYS)

    rows = (
        db.query(Transaction.date, Transaction.amount, Transaction.category_id)
        .join(Account, Account.id == Transaction.account_id)
        .filter(
            Account.user_id == current.id,
            Transaction.type == "expense",
            Transaction.date >= window_start,
            Transaction.date <= today,
        )
        .all()
    )

    # 工作日 vs 周末日均
    weekday_total = Decimal("0")
    weekend_total = Decimal("0")
    weekday_days: set[DateType] = set()
    weekend_days: set[DateType] = set()
    dow_totals = [Decimal("0")] * 7  # 0=Mon ... 6=Sun
    by_cat: dict[int, Decimal] = {}
    by_cat_dow: dict[int, list[Decimal]] = {}

    for d, amt, cid in rows:
        amt_d = Decimal(amt)
        dow = d.weekday()  # 0=Mon
        dow_totals[dow] += amt_d
        if dow < 5:
            weekday_total += amt_d
            weekday_days.add(d)
        else:
            weekend_total += amt_d
            weekend_days.add(d)
        by_cat[cid] = by_cat.get(cid, Decimal("0")) + amt_d
        bucket = by_cat_dow.setdefault(cid, [Decimal("0")] * 7)
        bucket[dow] += amt_d

    weekday_avg = float(weekday_total / len(weekday_days)) if weekday_days else 0.0
    weekend_avg = float(weekend_total / len(weekend_days)) if weekend_days else 0.0
    delta_pct = ((weekend_avg - weekday_avg) / weekday_avg * 100) if weekday_avg > 0 else 0.0

    day_of_week = [
        DayOfWeekBucket(day=i, label=DAY_LABELS_ZH[i], expense=float(dow_totals[i]))
        for i in range(7)
    ]

    # 小额交易月环比
    cur_start, cur_end = _month_window(0)
    prev_start, prev_end = _month_window(1)
    cur_count = (
        db.query(func.count(Transaction.id))
        .join(Account, Account.id == Transaction.account_id)
        .filter(
            Account.user_id == current.id,
            Transaction.type == "expense",
            Transaction.amount < SMALL_TX_THRESHOLD,
            Transaction.date >= cur_start,
            Transaction.date < cur_end,
        )
        .scalar()
        or 0
    )
    prev_count = (
        db.query(func.count(Transaction.id))
        .join(Account, Account.id == Transaction.account_id)
        .filter(
            Account.user_id == current.id,
            Transaction.type == "expense",
            Transaction.amount < SMALL_TX_THRESHOLD,
            Transaction.date >= prev_start,
            Transaction.date < prev_end,
        )
        .scalar()
        or 0
    )
    small_delta_pct = (
        ((cur_count - prev_count) / prev_count * 100) if prev_count > 0 else (100.0 if cur_count > 0 else 0.0)
    )

    # 头部分类 + 星期偏好
    top_category: TopCategorySkew | None = None
    if by_cat:
        top_cid, top_total = max(by_cat.items(), key=lambda x: x[1])
        cat = db.query(Category).filter(Category.id == top_cid).first()
        if cat:
            dow_in_cat = by_cat_dow.get(top_cid, [Decimal("0")] * 7)
            top_day_idx = max(range(7), key=lambda i: dow_in_cat[i])
            cat_sum = sum(dow_in_cat, Decimal("0"))
            top_day_share = float(dow_in_cat[top_day_idx] / cat_sum * 100) if cat_sum > 0 else 0.0
            total_exp = sum(by_cat.values(), Decimal("0"))
            share_pct = float(top_total / total_exp * 100) if total_exp > 0 else 0.0
            top_category = TopCategorySkew(
                category_id=top_cid,
                name=cat.name,
                icon=cat.icon,
                color=cat.color,
                total=float(top_total),
                share_pct=share_pct,
                top_day_label=DAY_LABELS_ZH[top_day_idx],
                top_day_share_pct=top_day_share,
            )

    return InsightsResponse(
        window_days=INSIGHTS_WINDOW_DAYS,
        weekday_vs_weekend=WeekdayWeekend(
            weekday_avg=weekday_avg,
            weekend_avg=weekend_avg,
            delta_pct=delta_pct,
        ),
        day_of_week=day_of_week,
        small_tx_trend=SmallTxTrend(
            threshold=float(SMALL_TX_THRESHOLD),
            current_count=int(cur_count),
            previous_count=int(prev_count),
            delta_pct=small_delta_pct,
        ),
        top_category=top_category,
    )


@router.get("/cashflow", response_model=CashflowResponse)
def cashflow_endpoint(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> CashflowResponse:
    """账户现金流预警:按近 30 天净流出速率估算每个账户还能撑多少天。"""
    today = DateType.today()
    window_start = today - timedelta(days=BURN_WINDOW_DAYS)

    accounts = db.query(Account).filter(Account.user_id == current.id).all()

    by_account: dict[int, dict[str, Decimal]] = {}
    if accounts:
        rows = (
            db.query(Transaction.account_id, Transaction.type, func.sum(Transaction.amount))
            .filter(
                Transaction.account_id.in_([a.id for a in accounts]),
                Transaction.date >= window_start,
                Transaction.date <= today,
            )
            .group_by(Transaction.account_id, Transaction.type)
            .all()
        )
        for aid, ttype, total in rows:
            by_account.setdefault(aid, {})[ttype] = Decimal(total)

    runway_list: list[AccountRunway] = []
    total_balance = Decimal("0")
    total_burn = Decimal("0")

    for a in accounts:
        balance = Decimal(a.balance or 0)
        stats = by_account.get(a.id, {})
        net_out = stats.get("expense", Decimal("0")) - stats.get("income", Decimal("0"))
        daily_burn = net_out / Decimal(BURN_WINDOW_DAYS)
        if daily_burn <= 0:
            level = "inflow"
            days_remaining: float | None = None
        else:
            days = float(balance / daily_burn) if daily_burn > 0 else None
            days_remaining = days
            if days is None or days >= 90 or balance <= 0:
                level = "ok" if balance > 0 else "critical"
            elif days < 30:
                level = "critical"
            else:
                level = "warning"

        total_balance += balance
        total_burn += daily_burn
        runway_list.append(
            AccountRunway(
                account_id=a.id,
                name=a.name,
                type=a.type or "cash",
                color=a.color,
                balance=float(balance),
                daily_burn=float(daily_burn),
                days_remaining=days_remaining,
                level=level,
            )
        )

    total_days = (
        float(total_balance / total_burn) if total_burn > 0 else None
    )
    return CashflowResponse(
        window_days=BURN_WINDOW_DAYS,
        total_balance=float(total_balance),
        total_daily_burn=float(total_burn),
        total_days_remaining=total_days,
        accounts=sorted(runway_list, key=lambda x: (x.level != "critical", x.days_remaining or 9999)),
    )


@router.get("/report", response_model=AnalysisReport)
def full_report(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> AnalysisReport:
    """聚合接口。整体走 Python 实现以保证首屏快;单项端点仍可走 R。

    rpy2 单次调用约 30-80ms,3 次串起来就拖慢首屏。Python 等价实现 <1ms,
    且数学一致。需要 R 的专业输出可用 /analysis/{health-score,suggestions,forecast}。
    """
    monthly = _monthly_data(db, current.id)
    ctx = _build_context(db, current.id, monthly)
    health = _py_health(ctx)
    suggestions = _py_suggestions(ctx)
    predicted = _py_forecast([m.savings for m in monthly])
    labels = _future_month_labels(6)
    forecast = [
        ForecastData(month=labels[i], predicted=predicted[i], is_actual=False)
        for i in range(min(6, len(predicted)))
    ]
    return AnalysisReport(
        health_score=health,
        suggestions=suggestions,
        monthly_data=monthly,
        forecast=forecast,
    )

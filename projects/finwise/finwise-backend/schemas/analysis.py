from pydantic import BaseModel


class HealthScoreBreakdown(BaseModel):
    savings_rate: int
    budget_control: int
    debt_ratio: int
    goal_progress: int


class HealthScore(BaseModel):
    total: int
    breakdown: HealthScoreBreakdown


class Suggestion(BaseModel):
    level: str  # warn / ok / tip
    text: str


class MonthlyData(BaseModel):
    month: str
    income: float
    expense: float
    savings: float


class ForecastData(BaseModel):
    month: str
    predicted: float
    is_actual: bool


class AnalysisReport(BaseModel):
    health_score: HealthScore
    suggestions: list[Suggestion]
    monthly_data: list[MonthlyData]
    forecast: list[ForecastData]


# ─── 行为洞察 ────────────────────────────────────────
class WeekdayWeekend(BaseModel):
    weekday_avg: float   # 工作日日均支出
    weekend_avg: float   # 周末日均支出
    delta_pct: float     # (weekend - weekday) / weekday × 100


class DayOfWeekBucket(BaseModel):
    day: int             # 0=周一 ... 6=周日
    label: str
    expense: float


class SmallTxTrend(BaseModel):
    threshold: float     # 阈值,默认 50
    current_count: int
    previous_count: int
    delta_pct: float


class TopCategorySkew(BaseModel):
    category_id: int
    name: str
    icon: str | None = None
    color: str | None = None
    total: float
    share_pct: float           # 占总支出比例
    top_day_label: str         # 该分类支出最多的星期
    top_day_share_pct: float   # 该 day 占该分类的比例


class InsightsResponse(BaseModel):
    window_days: int
    weekday_vs_weekend: WeekdayWeekend
    day_of_week: list[DayOfWeekBucket]
    small_tx_trend: SmallTxTrend
    top_category: TopCategorySkew | None = None


# ─── 现金流预警 ──────────────────────────────────────
class AccountRunway(BaseModel):
    account_id: int
    name: str
    type: str
    color: str | None = None
    balance: float
    daily_burn: float        # 正数 = 净流出, 负数 = 净流入
    days_remaining: float | None  # 净流入时为 null
    level: str               # critical / warning / ok / inflow


class CashflowResponse(BaseModel):
    window_days: int
    total_balance: float
    total_daily_burn: float
    total_days_remaining: float | None
    accounts: list[AccountRunway]

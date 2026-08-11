from datetime import date as DateType, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

Role = Literal["owner", "co_owner", "member"]
InvitationStatus = Literal["pending", "accepted", "declined", "revoked"]


# ─── 家庭 ────────────────────────────────────────────────
class FamilyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class FamilyUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)


# ─── 成员 ────────────────────────────────────────────────
class MemberResponse(BaseModel):
    user_id: int
    name: str
    email: str
    role: Role
    joined_at: datetime

    model_config = {"from_attributes": True}


class MemberRoleUpdate(BaseModel):
    role: Literal["co_owner", "member"]  # owner 不能通过该接口设


# ─── 邀请 ────────────────────────────────────────────────
class InvitationCreate(BaseModel):
    email: EmailStr


class InvitationResponse(BaseModel):
    id: int
    family_id: int
    family_name: str
    inviter_name: str
    invited_email: str
    status: InvitationStatus
    created_at: datetime
    responded_at: datetime | None = None


# ─── 预算 ────────────────────────────────────────────────
class FamilyBudgetUpsert(BaseModel):
    amount: Decimal = Field(gt=0)
    period: Literal["monthly", "yearly"] = "monthly"


class FamilyBudgetResponse(BaseModel):
    id: int
    amount: Decimal
    period: str
    spent: Decimal
    remaining: Decimal
    usage_rate: float
    over_budget: bool


# ─── 目标 ────────────────────────────────────────────────
class FamilyGoalCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    icon: str | None = None
    color: str | None = None
    target_amount: Decimal = Field(gt=0)
    deadline: DateType | None = None


class FamilyGoalUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    icon: str | None = None
    color: str | None = None
    target_amount: Decimal | None = Field(default=None, gt=0)
    deadline: DateType | None = None
    status: Literal["active", "completed"] | None = None


class FamilyGoalContribute(BaseModel):
    amount: Decimal = Field(gt=0)


class FamilyGoalResponse(BaseModel):
    id: int
    name: str
    icon: str | None
    color: str | None
    target_amount: Decimal
    current_amount: Decimal
    deadline: DateType | None
    status: str

    model_config = {"from_attributes": True}


# ─── 聚合 / 贡献 ─────────────────────────────────────────
class MemberContribution(BaseModel):
    user_id: int
    name: str
    income: Decimal
    expense: Decimal


class FamilySummary(BaseModel):
    family_id: int
    family_name: str
    month: str  # 'YYYY-MM'
    total_income: Decimal
    total_expense: Decimal
    net: Decimal
    contributions: list[MemberContribution]


# ─── 家庭整体响应 ─────────────────────────────────────────
class FamilyResponse(BaseModel):
    id: int
    name: str
    owner_id: int
    created_at: datetime
    my_role: Role
    members: list[MemberResponse]

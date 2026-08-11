from datetime import date as DateType
from decimal import Decimal
from pydantic import BaseModel, Field


class BudgetCreate(BaseModel):
    category_id: int | None = None
    amount: Decimal = Field(gt=0)
    period: str = "monthly"
    start_date: DateType


class BudgetUpdate(BaseModel):
    amount: Decimal | None = Field(default=None, gt=0)
    period: str | None = None


class BudgetResponse(BaseModel):
    id: int
    category_id: int | None
    category_name: str | None
    category_icon: str | None
    category_color: str | None
    amount: Decimal
    spent: Decimal
    period: str

    model_config = {"from_attributes": True}

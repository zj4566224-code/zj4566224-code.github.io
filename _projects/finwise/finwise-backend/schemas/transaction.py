from datetime import date as DateType
from decimal import Decimal
from pydantic import BaseModel, Field


class TransactionCreate(BaseModel):
    account_id: int
    category_id: int
    amount: Decimal = Field(gt=0)
    type: str  # income / expense
    date: DateType
    note: str | None = None


class TransactionUpdate(BaseModel):
    amount: Decimal | None = Field(default=None, gt=0)
    category_id: int | None = None
    date: DateType | None = None
    note: str | None = None


class TransactionResponse(BaseModel):
    id: int
    account_id: int
    category_id: int
    category_name: str
    category_icon: str | None
    category_color: str | None
    amount: Decimal
    type: str
    date: DateType
    note: str | None

    model_config = {"from_attributes": True}


class TransactionSummary(BaseModel):
    month: str
    income: Decimal
    expense: Decimal
    net: Decimal
    by_category: list[dict]

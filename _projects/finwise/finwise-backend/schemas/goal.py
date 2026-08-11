from datetime import date as DateType
from decimal import Decimal
from pydantic import BaseModel, Field


class GoalCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    icon: str | None = None
    color: str | None = None
    target_amount: Decimal = Field(gt=0)
    current_amount: Decimal = Decimal("0")
    deadline: DateType | None = None


class GoalUpdate(BaseModel):
    name: str | None = None
    icon: str | None = None
    color: str | None = None
    target_amount: Decimal | None = None
    deadline: DateType | None = None
    status: str | None = None


class GoalResponse(BaseModel):
    id: int
    name: str
    icon: str | None
    color: str | None
    target_amount: Decimal
    current_amount: Decimal
    deadline: DateType | None
    status: str

    model_config = {"from_attributes": True}


class GoalContribute(BaseModel):
    amount: Decimal = Field(gt=0)

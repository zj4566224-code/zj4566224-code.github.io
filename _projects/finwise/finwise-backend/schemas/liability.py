from datetime import date as DateType
from decimal import Decimal
from pydantic import BaseModel, Field


class LiabilityCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    type: str
    total_amount: Decimal
    remaining: Decimal
    interest_rate: Decimal | None = Decimal("0")
    due_date: DateType | None = None


class LiabilityUpdate(BaseModel):
    name: str | None = None
    remaining: Decimal | None = None
    interest_rate: Decimal | None = None
    due_date: DateType | None = None


class LiabilityResponse(BaseModel):
    id: int
    name: str
    type: str | None
    total_amount: Decimal | None
    remaining: Decimal | None
    interest_rate: Decimal | None
    due_date: DateType | None

    model_config = {"from_attributes": True}

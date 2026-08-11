from decimal import Decimal
from pydantic import BaseModel, Field


class AccountCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    type: str
    balance: Decimal = Decimal("0")
    color: str | None = None


class AccountUpdate(BaseModel):
    name: str | None = None
    type: str | None = None
    balance: Decimal | None = None
    color: str | None = None


class AccountResponse(BaseModel):
    id: int
    name: str
    type: str | None
    balance: Decimal
    color: str | None

    model_config = {"from_attributes": True}

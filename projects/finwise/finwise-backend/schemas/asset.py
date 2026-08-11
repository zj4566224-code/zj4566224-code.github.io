from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field


class AssetCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    type: str
    value: Decimal


class AssetUpdate(BaseModel):
    name: str | None = None
    type: str | None = None
    value: Decimal | None = None


class AssetResponse(BaseModel):
    id: int
    name: str
    type: str | None
    value: Decimal
    updated_at: datetime

    model_config = {"from_attributes": True}


class NetWorthResponse(BaseModel):
    total_assets: Decimal
    total_liabilities: Decimal
    net_worth: Decimal

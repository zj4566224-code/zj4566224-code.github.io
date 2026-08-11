from datetime import date as DateType
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field


class ImportPreviewRow(BaseModel):
    fingerprint: str
    date: DateType
    counterparty: str
    note: str
    amount: Decimal
    type: Literal["income", "expense", "transfer"]
    is_internal_transfer: bool
    is_duplicate: bool                  # 后端检测到与现有交易撞 fingerprint
    suggested_category_id: int | None   # 关键词匹配出来的分类


class ImportPreviewResponse(BaseModel):
    source: Literal["alipay", "wechat"]
    total: int
    importable: int                     # 可导入(非内部转账 + 非重复)
    duplicates: int
    internal_transfers: int
    rows: list[ImportPreviewRow]


class ImportCommitItem(BaseModel):
    date: DateType
    amount: Decimal = Field(gt=0)
    type: Literal["income", "expense"]
    category_id: int
    note: str | None = ""


class ImportCommitRequest(BaseModel):
    account_id: int
    items: list[ImportCommitItem]


class ImportCommitResponse(BaseModel):
    inserted: int

from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models.account import Account
from models.category import Category
from models.transaction import Transaction
from models.user import User
from schemas.import_bill import (
    ImportCommitRequest,
    ImportCommitResponse,
    ImportPreviewResponse,
    ImportPreviewRow,
)
from services.bill_parser import (
    ParsedBillRow,
    auto_category,
    parse_alipay,
    parse_wechat,
)

router = APIRouter()

MAX_FILE_BYTES = 5 * 1024 * 1024  # 5MB,普通账单足够


@router.post("/transactions/import/parse", response_model=ImportPreviewResponse)
async def parse_bill(
    file: UploadFile = File(...),
    source: Literal["alipay", "wechat"] = Form(...),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> ImportPreviewResponse:
    data = await file.read()
    if len(data) > MAX_FILE_BYTES:
        raise HTTPException(status_code=413, detail="文件过大,请控制在 5MB 以内")
    if len(data) == 0:
        raise HTTPException(status_code=400, detail="文件为空")

    try:
        if source == "alipay":
            parsed = parse_alipay(data)
        else:
            parsed = parse_wechat(data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 拿用户全部分类(包括 expense 和 income),给关键词匹配用
    user_cats = db.query(Category).filter(Category.user_id == current.id).all()
    name_to_id = {c.name: c.id for c in user_cats}

    # 查现有交易的 fingerprint 用于查重(仅当前用户)
    existing_fps = _existing_fingerprints(db, current.id, [r.fingerprint for r in parsed])

    rows: list[ImportPreviewRow] = []
    counts = {"importable": 0, "dup": 0, "internal": 0}
    for r in parsed:
        is_dup = r.fingerprint in existing_fps
        suggested = None
        if r.type in ("income", "expense") and not r.is_internal_transfer:
            suggested = auto_category(r.counterparty, r.note, name_to_id)

        if r.is_internal_transfer:
            counts["internal"] += 1
        elif is_dup:
            counts["dup"] += 1
        else:
            counts["importable"] += 1

        rows.append(
            ImportPreviewRow(
                fingerprint=r.fingerprint,
                date=r.date,
                counterparty=r.counterparty,
                note=r.note,
                amount=r.amount,
                type=r.type,
                is_internal_transfer=r.is_internal_transfer,
                is_duplicate=is_dup,
                suggested_category_id=suggested,
            )
        )

    return ImportPreviewResponse(
        source=source,
        total=len(parsed),
        importable=counts["importable"],
        duplicates=counts["dup"],
        internal_transfers=counts["internal"],
        rows=rows,
    )


@router.post(
    "/transactions/import/commit",
    response_model=ImportCommitResponse,
    status_code=status.HTTP_201_CREATED,
)
def commit_bill(
    payload: ImportCommitRequest,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> ImportCommitResponse:
    # 校验账户属于当前用户
    account = (
        db.query(Account)
        .filter(Account.id == payload.account_id, Account.user_id == current.id)
        .first()
    )
    if not account:
        raise HTTPException(status_code=404, detail="账户不存在")

    if not payload.items:
        return ImportCommitResponse(inserted=0)

    # 校验所有 category_id 属于当前用户
    cat_ids = {it.category_id for it in payload.items}
    valid_cat_ids = {
        c.id
        for c in db.query(Category)
        .filter(Category.user_id == current.id, Category.id.in_(cat_ids))
        .all()
    }
    missing = cat_ids - valid_cat_ids
    if missing:
        raise HTTPException(status_code=400, detail=f"分类不存在或无权访问: {sorted(missing)}")

    # 累计账户余额变化
    delta_balance = Decimal("0")
    inserted = 0
    for it in payload.items:
        tx = Transaction(
            account_id=payload.account_id,
            category_id=it.category_id,
            amount=it.amount,
            type=it.type,
            date=it.date,
            note=it.note or "",
        )
        db.add(tx)
        delta_balance += it.amount if it.type == "income" else -it.amount
        inserted += 1

    account.balance = (account.balance or Decimal("0")) + delta_balance
    db.commit()
    return ImportCommitResponse(inserted=inserted)


def _existing_fingerprints(db: Session, user_id: int, candidate_fps: list[str]) -> set[str]:
    """为了避免每条交易单独查 DB,这里直接拉用户全部 (date, amount, account->counterparty?) —
    但 transactions 表没存 counterparty,只能用 (date, amount) 近似。
    更精确的方案是把 fingerprint 也存进 transactions(后续可改 schema),v1 先用 (date, amount, note) 做检查。
    """
    if not candidate_fps:
        return set()
    # 暂用 (date, amount, note) 拼接作为近似 fingerprint
    rows = (
        db.query(Transaction.date, Transaction.amount, Transaction.note)
        .join(Account, Account.id == Transaction.account_id)
        .filter(Account.user_id == user_id)
        .all()
    )
    import hashlib

    def fp(d, amt, note: str | None) -> str:
        # 用 note 里的"对方"近似;失败也无所谓,最多漏检
        cp = (note or "").split(" · ")[0] if note else ""
        raw = f"{d.isoformat()}|{Decimal(amt)}|{cp}"
        return hashlib.md5(raw.encode("utf-8")).hexdigest()[:16]

    return {fp(d, amt, n) for d, amt, n in rows}

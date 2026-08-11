from datetime import date as DateType
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from database import get_db
from dependencies import get_current_user
from models.account import Account
from models.category import Category
from models.transaction import Transaction
from models.user import User
from schemas.transaction import (
    TransactionCreate,
    TransactionResponse,
    TransactionSummary,
    TransactionUpdate,
)

router = APIRouter()


def _serialize(tx: Transaction) -> dict:
    return {
        "id": tx.id,
        "account_id": tx.account_id,
        "category_id": tx.category_id,
        "category_name": tx.category.name if tx.category else "",
        "category_icon": tx.category.icon if tx.category else None,
        "category_color": tx.category.color if tx.category else None,
        "amount": tx.amount,
        "type": tx.type,
        "date": tx.date,
        "note": tx.note,
    }


def _month_bounds(month: str) -> tuple[DateType, DateType]:
    year, mo = map(int, month.split("-"))
    start = DateType(year, mo, 1)
    if mo == 12:
        end = DateType(year + 1, 1, 1)
    else:
        end = DateType(year, mo + 1, 1)
    return start, end


@router.get("", response_model=list[TransactionResponse])
def list_transactions(
    month: str | None = Query(None, pattern=r"^\d{4}-\d{2}$"),
    type: str | None = None,
    category_id: int | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[dict]:
    q = (
        db.query(Transaction)
        .join(Account, Account.id == Transaction.account_id)
        .options(joinedload(Transaction.category))  # 关联加载,消除 N+1
        .filter(Account.user_id == current.id)
    )
    if month:
        start, end = _month_bounds(month)
        q = q.filter(Transaction.date >= start, Transaction.date < end)
    if type:
        q = q.filter(Transaction.type == type)
    if category_id is not None:
        q = q.filter(Transaction.category_id == category_id)

    q = q.order_by(Transaction.date.desc(), Transaction.id.desc())
    items = q.offset((page - 1) * page_size).limit(page_size).all()
    return [_serialize(tx) for tx in items]


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(
    payload: TransactionCreate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> dict:
    account = (
        db.query(Account)
        .filter(Account.id == payload.account_id, Account.user_id == current.id)
        .first()
    )
    if not account:
        raise HTTPException(status_code=404, detail="账户不存在")
    category = (
        db.query(Category)
        .filter(Category.id == payload.category_id, Category.user_id == current.id)
        .first()
    )
    if not category:
        raise HTTPException(status_code=404, detail="分类不存在")

    tx = Transaction(**payload.model_dump())
    db.add(tx)

    # 同步更新账户余额
    delta = payload.amount if payload.type == "income" else -payload.amount
    account.balance = (account.balance or Decimal("0")) + delta

    db.commit()
    db.refresh(tx)
    tx.category = category  # 复用已查到的分类,避免懒加载多打一次 SQL
    return _serialize(tx)


@router.put("/{tx_id}", response_model=TransactionResponse)
def update_transaction(
    tx_id: int,
    payload: TransactionUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> dict:
    tx = (
        db.query(Transaction)
        .join(Account, Account.id == Transaction.account_id)
        .filter(Transaction.id == tx_id, Account.user_id == current.id)
        .first()
    )
    if not tx:
        raise HTTPException(status_code=404, detail="记录不存在")

    data = payload.model_dump(exclude_unset=True)
    if "category_id" in data:
        category = (
            db.query(Category)
            .filter(Category.id == data["category_id"], Category.user_id == current.id)
            .first()
        )
        if not category:
            raise HTTPException(status_code=404, detail="分类不存在")

    old_amount = tx.amount
    for k, v in data.items():
        setattr(tx, k, v)

    # 金额变化时同步账户余额
    if "amount" in data:
        sign = 1 if tx.type == "income" else -1
        delta = (Decimal(str(data["amount"])) - Decimal(str(old_amount))) * sign
        tx.account.balance = (tx.account.balance or Decimal("0")) + delta

    db.commit()
    db.refresh(tx)
    return _serialize(tx)


@router.delete("/{tx_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    tx_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> None:
    tx = (
        db.query(Transaction)
        .join(Account, Account.id == Transaction.account_id)
        .filter(Transaction.id == tx_id, Account.user_id == current.id)
        .first()
    )
    if not tx:
        raise HTTPException(status_code=404, detail="记录不存在")

    sign = -1 if tx.type == "income" else 1
    tx.account.balance = (tx.account.balance or Decimal("0")) + tx.amount * sign

    db.delete(tx)
    db.commit()


@router.get("/summary", response_model=TransactionSummary)
def summary(
    month: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> TransactionSummary:
    start, end = _month_bounds(month)
    base = (
        db.query(Transaction)
        .join(Account, Account.id == Transaction.account_id)
        .filter(
            Account.user_id == current.id,
            Transaction.date >= start,
            Transaction.date < end,
        )
    )

    income = base.filter(Transaction.type == "income").with_entities(
        func.coalesce(func.sum(Transaction.amount), 0)
    ).scalar() or Decimal("0")
    expense = base.filter(Transaction.type == "expense").with_entities(
        func.coalesce(func.sum(Transaction.amount), 0)
    ).scalar() or Decimal("0")

    by_cat_rows = (
        base.filter(Transaction.type == "expense")
        .join(Category, Category.id == Transaction.category_id)
        .with_entities(
            Category.id,
            Category.name,
            Category.icon,
            Category.color,
            func.sum(Transaction.amount).label("total"),
        )
        .group_by(Category.id, Category.name, Category.icon, Category.color)
        .order_by(func.sum(Transaction.amount).desc())
        .all()
    )

    by_category = [
        {
            "category_id": r.id,
            "name": r.name,
            "icon": r.icon,
            "color": r.color,
            "amount": float(r.total),
        }
        for r in by_cat_rows
    ]

    return TransactionSummary(
        month=month,
        income=Decimal(income),
        expense=Decimal(expense),
        net=Decimal(income) - Decimal(expense),
        by_category=by_category,
    )

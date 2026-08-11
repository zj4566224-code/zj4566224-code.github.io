from datetime import date as DateType
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models.account import Account
from models.budget import Budget
from models.category import Category
from models.transaction import Transaction
from models.user import User
from schemas.budget import BudgetCreate, BudgetResponse, BudgetUpdate

router = APIRouter()


def _current_month_bounds() -> tuple[DateType, DateType]:
    today = DateType.today()
    start = DateType(today.year, today.month, 1)
    end = DateType(
        today.year + (1 if today.month == 12 else 0),
        1 if today.month == 12 else today.month + 1,
        1,
    )
    return start, end


def _all_spent_this_month(db: Session, user_id: int) -> tuple[Decimal, dict[int, Decimal]]:
    """一次查询拿到本月总支出 + 每个分类的小计,避免 N+1。"""
    start, end = _current_month_bounds()
    base = (
        db.query(Transaction.category_id, func.sum(Transaction.amount))
        .join(Account, Account.id == Transaction.account_id)
        .filter(
            Account.user_id == user_id,
            Transaction.type == "expense",
            Transaction.date >= start,
            Transaction.date < end,
        )
        .group_by(Transaction.category_id)
        .all()
    )
    by_category: dict[int, Decimal] = {cid: Decimal(total) for cid, total in base}
    total = sum(by_category.values(), Decimal("0"))
    return total, by_category


def _serialize(b: Budget, category: Category | None, spent: Decimal) -> dict:
    return {
        "id": b.id,
        "category_id": b.category_id,
        "category_name": category.name if category else "总预算",
        "category_icon": category.icon if category else "📊",
        "category_color": category.color if category else "#0a84ff",
        "amount": b.amount,
        "spent": spent,
        "period": b.period,
    }


def _categories_for(db: Session, ids: list[int]) -> dict[int, Category]:
    if not ids:
        return {}
    rows = db.query(Category).filter(Category.id.in_(ids)).all()
    return {c.id: c for c in rows}


@router.get("", response_model=list[BudgetResponse])
def list_budgets(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[dict]:
    items = db.query(Budget).filter(Budget.user_id == current.id).order_by(Budget.id).all()
    total_spent, by_cat = _all_spent_this_month(db, current.id)
    cat_map = _categories_for(db, [b.category_id for b in items if b.category_id is not None])

    out: list[dict] = []
    for b in items:
        if b.category_id is None:
            spent = total_spent
            category = None
        else:
            spent = by_cat.get(b.category_id, Decimal("0"))
            category = cat_map.get(b.category_id)
        out.append(_serialize(b, category, spent))
    return out


@router.post("", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
def create_budget(
    payload: BudgetCreate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> dict:
    category: Category | None = None
    if payload.category_id is not None:
        category = (
            db.query(Category)
            .filter(Category.id == payload.category_id, Category.user_id == current.id)
            .first()
        )
        if not category:
            raise HTTPException(status_code=404, detail="分类不存在")
    b = Budget(user_id=current.id, **payload.model_dump())
    db.add(b)
    db.commit()
    db.refresh(b)

    total_spent, by_cat = _all_spent_this_month(db, current.id)
    spent = (
        total_spent
        if b.category_id is None
        else by_cat.get(b.category_id, Decimal("0"))
    )
    return _serialize(b, category, spent)


@router.put("/{budget_id}", response_model=BudgetResponse)
def update_budget(
    budget_id: int,
    payload: BudgetUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> dict:
    b = db.query(Budget).filter(Budget.id == budget_id, Budget.user_id == current.id).first()
    if not b:
        raise HTTPException(status_code=404, detail="预算不存在")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(b, k, v)
    db.commit()
    db.refresh(b)

    category: Category | None = None
    if b.category_id is not None:
        category = db.query(Category).filter(Category.id == b.category_id).first()

    total_spent, by_cat = _all_spent_this_month(db, current.id)
    spent = (
        total_spent
        if b.category_id is None
        else by_cat.get(b.category_id, Decimal("0"))
    )
    return _serialize(b, category, spent)


@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget(
    budget_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> None:
    b = db.query(Budget).filter(Budget.id == budget_id, Budget.user_id == current.id).first()
    if not b:
        raise HTTPException(status_code=404, detail="预算不存在")
    db.delete(b)
    db.commit()


@router.get("/progress")
def progress(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[dict]:
    items = db.query(Budget).filter(Budget.user_id == current.id).all()
    total_spent, by_cat = _all_spent_this_month(db, current.id)
    result = []
    for b in items:
        spent = total_spent if b.category_id is None else by_cat.get(b.category_id, Decimal("0"))
        amount = Decimal(b.amount)
        ratio = float(spent / amount) if amount > 0 else 0.0
        result.append(
            {
                "budget_id": b.id,
                "category_id": b.category_id,
                "amount": amount,
                "spent": spent,
                "remaining": amount - spent,
                "usage_rate": round(ratio, 4),
                "over_budget": spent > amount,
            }
        )
    return result

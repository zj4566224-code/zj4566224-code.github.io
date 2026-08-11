from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models.category import Category
from models.user import User
from schemas.category import CategoryCreate, CategoryResponse, CategoryUpdate

router = APIRouter()


@router.get("", response_model=list[CategoryResponse])
def list_categories(
    type: str | None = None,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[Category]:
    q = db.query(Category).filter(Category.user_id == current.id)
    if type:
        q = q.filter(Category.type == type)
    return q.order_by(Category.id).all()


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    payload: CategoryCreate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Category:
    obj = Category(user_id=current.id, **payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.put("/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: int,
    payload: CategoryUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Category:
    obj = (
        db.query(Category)
        .filter(Category.id == category_id, Category.user_id == current.id)
        .first()
    )
    if not obj:
        raise HTTPException(status_code=404, detail="分类不存在")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> None:
    obj = (
        db.query(Category)
        .filter(Category.id == category_id, Category.user_id == current.id)
        .first()
    )
    if not obj:
        raise HTTPException(status_code=404, detail="分类不存在")
    db.delete(obj)
    db.commit()

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models.liability import Liability
from models.user import User
from schemas.liability import LiabilityCreate, LiabilityResponse, LiabilityUpdate

router = APIRouter()


@router.get("", response_model=list[LiabilityResponse])
def list_liabilities(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[Liability]:
    return db.query(Liability).filter(Liability.user_id == current.id).order_by(Liability.id).all()


@router.post("", response_model=LiabilityResponse, status_code=status.HTTP_201_CREATED)
def create_liability(
    payload: LiabilityCreate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Liability:
    obj = Liability(user_id=current.id, **payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.put("/{liability_id}", response_model=LiabilityResponse)
def update_liability(
    liability_id: int,
    payload: LiabilityUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Liability:
    obj = (
        db.query(Liability)
        .filter(Liability.id == liability_id, Liability.user_id == current.id)
        .first()
    )
    if not obj:
        raise HTTPException(status_code=404, detail="负债不存在")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{liability_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_liability(
    liability_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> None:
    obj = (
        db.query(Liability)
        .filter(Liability.id == liability_id, Liability.user_id == current.id)
        .first()
    )
    if not obj:
        raise HTTPException(status_code=404, detail="负债不存在")
    db.delete(obj)
    db.commit()

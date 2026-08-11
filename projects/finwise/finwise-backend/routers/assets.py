from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models.asset import Asset
from models.liability import Liability
from models.user import User
from schemas.asset import AssetCreate, AssetResponse, AssetUpdate, NetWorthResponse

router = APIRouter()


@router.get("", response_model=list[AssetResponse])
def list_assets(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[Asset]:
    return db.query(Asset).filter(Asset.user_id == current.id).order_by(Asset.id).all()


@router.post("", response_model=AssetResponse, status_code=status.HTTP_201_CREATED)
def create_asset(
    payload: AssetCreate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Asset:
    a = Asset(user_id=current.id, **payload.model_dump())
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


@router.put("/{asset_id}", response_model=AssetResponse)
def update_asset(
    asset_id: int,
    payload: AssetUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Asset:
    a = db.query(Asset).filter(Asset.id == asset_id, Asset.user_id == current.id).first()
    if not a:
        raise HTTPException(status_code=404, detail="资产不存在")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(a, k, v)
    db.commit()
    db.refresh(a)
    return a


@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> None:
    a = db.query(Asset).filter(Asset.id == asset_id, Asset.user_id == current.id).first()
    if not a:
        raise HTTPException(status_code=404, detail="资产不存在")
    db.delete(a)
    db.commit()


# 这个端点挂在 / 下，main.py 用 prefix="" 单独挂载
networth_router = APIRouter()


@networth_router.get("/net-worth", response_model=NetWorthResponse)
def net_worth(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> NetWorthResponse:
    total_assets = (
        db.query(func.coalesce(func.sum(Asset.value), 0))
        .filter(Asset.user_id == current.id)
        .scalar()
        or Decimal("0")
    )
    total_liabilities = (
        db.query(func.coalesce(func.sum(Liability.remaining), 0))
        .filter(Liability.user_id == current.id)
        .scalar()
        or Decimal("0")
    )
    return NetWorthResponse(
        total_assets=Decimal(total_assets),
        total_liabilities=Decimal(total_liabilities),
        net_worth=Decimal(total_assets) - Decimal(total_liabilities),
    )

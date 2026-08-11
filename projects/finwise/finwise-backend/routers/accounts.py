from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models.account import Account
from models.user import User
from schemas.account import AccountCreate, AccountResponse, AccountUpdate

router = APIRouter()


@router.get("", response_model=list[AccountResponse])
def list_accounts(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[Account]:
    return db.query(Account).filter(Account.user_id == current.id).order_by(Account.id).all()


@router.post("", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
def create_account(
    payload: AccountCreate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Account:
    obj = Account(user_id=current.id, **payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.put("/{account_id}", response_model=AccountResponse)
def update_account(
    account_id: int,
    payload: AccountUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Account:
    obj = db.query(Account).filter(Account.id == account_id, Account.user_id == current.id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="账户不存在")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(
    account_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> None:
    obj = db.query(Account).filter(Account.id == account_id, Account.user_id == current.id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="账户不存在")
    db.delete(obj)
    db.commit()

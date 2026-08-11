from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models.account import Account
from models.category import Category
from models.user import User
from schemas.user import (
    LoginRequest,
    PasswordChange,
    Token,
    UserCreate,
    UserResponse,
    UserUpdate,
)
from services.auth import create_access_token, hash_password, verify_password

router = APIRouter()


DEFAULT_EXPENSE_CATEGORIES = [
    ("餐饮", "🍜", "#ff9f0a"),
    ("交通", "🚇", "#0a84ff"),
    ("住房", "🏠", "#bf5af2"),
    ("娱乐", "🎮", "#5ac8fa"),
    ("购物", "🛍️", "#ff453a"),
    ("医疗", "💊", "#6e6ce8"),
]

DEFAULT_INCOME_CATEGORIES = [
    ("工资", "💰", "#32d74b"),
    ("副业", "💼", "#5ac8fa"),
]


def _seed_defaults(db: Session, user: User) -> None:
    for name, icon, color in DEFAULT_EXPENSE_CATEGORIES:
        db.add(Category(user_id=user.id, name=name, type="expense", icon=icon, color=color))
    for name, icon, color in DEFAULT_INCOME_CATEGORIES:
        db.add(Category(user_id=user.id, name=name, type="income", icon=icon, color=color))
    db.add(Account(user_id=user.id, name="默认账户", type="bank", balance=0, color="#0a84ff"))
    db.commit()


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)) -> Token:
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="邮箱已被注册")
    user = User(
        email=payload.email,
        name=payload.name,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    _seed_defaults(db, user)
    token = create_access_token({"sub": str(user.id)})
    return Token(access_token=token)


@router.post("/login", response_model=Token)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> Token:
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="邮箱或密码错误")
    token = create_access_token({"sub": str(user.id)})
    return Token(access_token=token)


@router.post("/login/form", response_model=Token, include_in_schema=False)
def login_form(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)) -> Token:
    """OAuth2 form-encoded login — supports the Swagger 'Authorize' button."""
    user = db.query(User).filter(User.email == form.username).first()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=401, detail="邮箱或密码错误")
    token = create_access_token({"sub": str(user.id)})
    return Token(access_token=token)


@router.get("/me", response_model=UserResponse)
def me(current: User = Depends(get_current_user)) -> User:
    return current


@router.patch("/me", response_model=UserResponse)
def update_me(
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> User:
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(current, k, v)
    db.commit()
    db.refresh(current)
    return current


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    payload: PasswordChange,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> None:
    if not verify_password(payload.old_password, current.password_hash):
        raise HTTPException(status_code=400, detail="原密码不正确")
    current.password_hash = hash_password(payload.new_password)
    db.commit()

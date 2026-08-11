from datetime import date as DateType, datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from database import get_db
from dependencies import get_current_user
from models.account import Account
from models.family import Family
from models.family_budget import FamilyBudget
from models.family_goal import FamilyGoal
from models.family_invitation import FamilyInvitation
from models.family_member import FamilyMember
from models.transaction import Transaction
from models.user import User
from schemas.family import (
    FamilyBudgetResponse,
    FamilyBudgetUpsert,
    FamilyCreate,
    FamilyGoalContribute,
    FamilyGoalCreate,
    FamilyGoalResponse,
    FamilyGoalUpdate,
    FamilyResponse,
    FamilySummary,
    FamilyUpdate,
    InvitationCreate,
    InvitationResponse,
    MemberContribution,
    MemberResponse,
    MemberRoleUpdate,
)

router = APIRouter()
invitations_router = APIRouter()  # 挂在 /invitations,不在 /families 下


# ─────────────────────────────────────────
# helpers
# ─────────────────────────────────────────
def _get_my_membership(db: Session, user: User) -> FamilyMember:
    m = db.query(FamilyMember).filter(FamilyMember.user_id == user.id).first()
    if not m:
        raise HTTPException(status_code=404, detail="未加入任何家庭")
    return m


def _require_role(m: FamilyMember, allowed: tuple[str, ...]) -> None:
    if m.role not in allowed:
        raise HTTPException(status_code=403, detail="权限不足")


def _month_bounds(month: str) -> tuple[DateType, DateType]:
    year, mo = map(int, month.split("-"))
    start = DateType(year, mo, 1)
    end = DateType(year + (1 if mo == 12 else 0), 1 if mo == 12 else mo + 1, 1)
    return start, end


def _serialize_member(m: FamilyMember) -> dict:
    return {
        "user_id": m.user_id,
        "name": m.user.name or "",
        "email": m.user.email,
        "role": m.role,
        "joined_at": m.joined_at,
    }


def _serialize_family(family: Family, my_role: str) -> dict:
    members = (
        Session.object_session(family)
        .query(FamilyMember)
        .options(joinedload(FamilyMember.user))
        .filter(FamilyMember.family_id == family.id)
        .order_by(FamilyMember.id)
        .all()
    )
    return {
        "id": family.id,
        "name": family.name,
        "owner_id": family.owner_id,
        "created_at": family.created_at,
        "my_role": my_role,
        "members": [_serialize_member(m) for m in members],
    }


def _family_expense_by_member(
    db: Session, family_id: int, start: DateType, end: DateType
) -> dict[int, dict[str, Decimal]]:
    """返回 {user_id: {'income': X, 'expense': Y}},全家本月所有成员的收支汇总。"""
    rows = (
        db.query(
            Account.user_id,
            Transaction.type,
            func.coalesce(func.sum(Transaction.amount), 0).label("total"),
        )
        .join(Account, Account.id == Transaction.account_id)
        .join(FamilyMember, FamilyMember.user_id == Account.user_id)
        .filter(
            FamilyMember.family_id == family_id,
            Transaction.date >= start,
            Transaction.date < end,
        )
        .group_by(Account.user_id, Transaction.type)
        .all()
    )
    result: dict[int, dict[str, Decimal]] = {}
    for user_id, ttype, total in rows:
        bucket = result.setdefault(user_id, {"income": Decimal("0"), "expense": Decimal("0")})
        bucket[ttype] = Decimal(total)
    return result


# ─────────────────────────────────────────
# 家庭 CRUD
# ─────────────────────────────────────────
@router.post("", response_model=FamilyResponse, status_code=status.HTTP_201_CREATED)
def create_family(
    payload: FamilyCreate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> dict:
    # 一人只能在一个家庭
    if db.query(FamilyMember).filter(FamilyMember.user_id == current.id).first():
        raise HTTPException(status_code=400, detail="已加入某个家庭,需先退出才能创建新家庭")
    family = Family(name=payload.name, owner_id=current.id)
    db.add(family)
    db.flush()  # 拿 id
    db.add(FamilyMember(family_id=family.id, user_id=current.id, role="owner"))
    db.commit()
    db.refresh(family)
    return _serialize_family(family, "owner")


@router.get("/me", response_model=FamilyResponse)
def get_my_family(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> dict:
    m = _get_my_membership(db, current)
    return _serialize_family(m.family, m.role)


@router.patch("/me", response_model=FamilyResponse)
def rename_family(
    payload: FamilyUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> dict:
    m = _get_my_membership(db, current)
    _require_role(m, ("owner",))
    if payload.name:
        m.family.name = payload.name
    db.commit()
    db.refresh(m.family)
    return _serialize_family(m.family, m.role)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def disband_family(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> None:
    """owner 解散家庭。级联删除成员/邀请/预算/目标。"""
    m = _get_my_membership(db, current)
    _require_role(m, ("owner",))
    db.delete(m.family)
    db.commit()


@router.post("/me/leave", status_code=status.HTTP_204_NO_CONTENT)
def leave_family(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> None:
    m = _get_my_membership(db, current)
    if m.role == "owner":
        raise HTTPException(status_code=400, detail="owner 不能退出,请先转让或解散家庭")
    db.delete(m)
    db.commit()


# ─────────────────────────────────────────
# 成员管理
# ─────────────────────────────────────────
@router.patch("/me/members/{user_id}/role", response_model=MemberResponse)
def update_member_role(
    user_id: int,
    payload: MemberRoleUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> dict:
    me = _get_my_membership(db, current)
    _require_role(me, ("owner",))
    if user_id == current.id:
        raise HTTPException(status_code=400, detail="不能修改自己的角色")
    target = (
        db.query(FamilyMember)
        .options(joinedload(FamilyMember.user))
        .filter(FamilyMember.family_id == me.family_id, FamilyMember.user_id == user_id)
        .first()
    )
    if not target:
        raise HTTPException(status_code=404, detail="成员不存在")
    target.role = payload.role
    db.commit()
    db.refresh(target)
    return _serialize_member(target)


@router.delete("/me/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    user_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> None:
    me = _get_my_membership(db, current)
    _require_role(me, ("owner",))
    if user_id == current.id:
        raise HTTPException(status_code=400, detail="owner 请使用解散家庭接口")
    target = (
        db.query(FamilyMember)
        .filter(FamilyMember.family_id == me.family_id, FamilyMember.user_id == user_id)
        .first()
    )
    if not target:
        raise HTTPException(status_code=404, detail="成员不存在")
    db.delete(target)
    db.commit()


# ─────────────────────────────────────────
# 邀请(家庭侧)
# ─────────────────────────────────────────
@router.post("/me/invitations", response_model=InvitationResponse, status_code=status.HTTP_201_CREATED)
def invite_user(
    payload: InvitationCreate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> dict:
    me = _get_my_membership(db, current)
    _require_role(me, ("owner", "co_owner"))
    email = payload.email.lower()

    # 必须是已注册用户
    invited_user = db.query(User).filter(func.lower(User.email) == email).first()
    if not invited_user:
        raise HTTPException(status_code=404, detail="该邮箱尚未注册 FinWise,请对方先注册账号")
    if invited_user.id == current.id:
        raise HTTPException(status_code=400, detail="不能邀请自己")

    existing_membership = (
        db.query(FamilyMember).filter(FamilyMember.user_id == invited_user.id).first()
    )
    if existing_membership and existing_membership.family_id == me.family_id:
        raise HTTPException(status_code=400, detail="该用户已在家庭中")
    if existing_membership:
        raise HTTPException(status_code=400, detail="该用户已加入其他家庭")

    # 同一邮箱的 pending 邀请去重
    existing = (
        db.query(FamilyInvitation)
        .filter(
            FamilyInvitation.family_id == me.family_id,
            func.lower(FamilyInvitation.invited_email) == email,
            FamilyInvitation.status == "pending",
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="已有待处理的邀请")

    inv = FamilyInvitation(
        family_id=me.family_id,
        inviter_id=current.id,
        invited_email=email,
        status="pending",
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return {
        "id": inv.id,
        "family_id": inv.family_id,
        "family_name": me.family.name,
        "inviter_name": current.name or current.email,
        "invited_email": inv.invited_email,
        "status": inv.status,
        "created_at": inv.created_at,
        "responded_at": inv.responded_at,
    }


@router.get("/me/invitations", response_model=list[InvitationResponse])
def list_family_invitations(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[dict]:
    me = _get_my_membership(db, current)
    _require_role(me, ("owner", "co_owner"))
    rows = (
        db.query(FamilyInvitation)
        .filter(FamilyInvitation.family_id == me.family_id)
        .order_by(FamilyInvitation.created_at.desc())
        .all()
    )
    return [
        {
            "id": r.id,
            "family_id": r.family_id,
            "family_name": me.family.name,
            "inviter_name": current.name or current.email,
            "invited_email": r.invited_email,
            "status": r.status,
            "created_at": r.created_at,
            "responded_at": r.responded_at,
        }
        for r in rows
    ]


@router.delete("/me/invitations/{invitation_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_invitation(
    invitation_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> None:
    me = _get_my_membership(db, current)
    _require_role(me, ("owner", "co_owner"))
    inv = (
        db.query(FamilyInvitation)
        .filter(
            FamilyInvitation.id == invitation_id,
            FamilyInvitation.family_id == me.family_id,
            FamilyInvitation.status == "pending",
        )
        .first()
    )
    if not inv:
        raise HTTPException(status_code=404, detail="邀请不存在或已处理")
    inv.status = "revoked"
    inv.responded_at = datetime.now(timezone.utc)
    db.commit()


# ─────────────────────────────────────────
# 邀请(被邀人侧) - 挂 /invitations 路径
# ─────────────────────────────────────────
@invitations_router.get("/me", response_model=list[InvitationResponse])
def my_invitations(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[dict]:
    rows = (
        db.query(FamilyInvitation, Family, User)
        .join(Family, Family.id == FamilyInvitation.family_id)
        .join(User, User.id == FamilyInvitation.inviter_id)
        .filter(
            func.lower(FamilyInvitation.invited_email) == current.email.lower(),
            FamilyInvitation.status == "pending",
        )
        .order_by(FamilyInvitation.created_at.desc())
        .all()
    )
    return [
        {
            "id": inv.id,
            "family_id": inv.family_id,
            "family_name": fam.name,
            "inviter_name": inviter.name or inviter.email,
            "invited_email": inv.invited_email,
            "status": inv.status,
            "created_at": inv.created_at,
            "responded_at": inv.responded_at,
        }
        for inv, fam, inviter in rows
    ]


@invitations_router.post("/{invitation_id}/accept", response_model=FamilyResponse)
def accept_invitation(
    invitation_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> dict:
    inv = (
        db.query(FamilyInvitation)
        .filter(
            FamilyInvitation.id == invitation_id,
            func.lower(FamilyInvitation.invited_email) == current.email.lower(),
            FamilyInvitation.status == "pending",
        )
        .first()
    )
    if not inv:
        raise HTTPException(status_code=404, detail="邀请不存在或已处理")
    # 检查不能已在其他家庭
    if db.query(FamilyMember).filter(FamilyMember.user_id == current.id).first():
        raise HTTPException(status_code=400, detail="已加入其他家庭,请先退出")

    member = FamilyMember(family_id=inv.family_id, user_id=current.id, role="member")
    db.add(member)
    inv.status = "accepted"
    inv.responded_at = datetime.now(timezone.utc)
    # 同邮箱的其他 pending 邀请自动 declined
    db.query(FamilyInvitation).filter(
        FamilyInvitation.id != inv.id,
        func.lower(FamilyInvitation.invited_email) == current.email.lower(),
        FamilyInvitation.status == "pending",
    ).update(
        {"status": "declined", "responded_at": datetime.now(timezone.utc)},
        synchronize_session=False,
    )
    db.commit()
    family = db.query(Family).filter(Family.id == inv.family_id).first()
    return _serialize_family(family, "member")


@invitations_router.post("/{invitation_id}/decline", status_code=status.HTTP_204_NO_CONTENT)
def decline_invitation(
    invitation_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> None:
    inv = (
        db.query(FamilyInvitation)
        .filter(
            FamilyInvitation.id == invitation_id,
            func.lower(FamilyInvitation.invited_email) == current.email.lower(),
            FamilyInvitation.status == "pending",
        )
        .first()
    )
    if not inv:
        raise HTTPException(status_code=404, detail="邀请不存在或已处理")
    inv.status = "declined"
    inv.responded_at = datetime.now(timezone.utc)
    db.commit()


# ─────────────────────────────────────────
# 家庭预算
# ─────────────────────────────────────────
def _current_month_bounds() -> tuple[DateType, DateType]:
    today = DateType.today()
    return _month_bounds(f"{today.year}-{today.month:02d}")


@router.get("/me/budget", response_model=FamilyBudgetResponse | None)
def get_family_budget(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> dict | None:
    me = _get_my_membership(db, current)
    b = (
        db.query(FamilyBudget)
        .filter(FamilyBudget.family_id == me.family_id, FamilyBudget.period == "monthly")
        .first()
    )
    if not b:
        return None
    start, end = _current_month_bounds()
    by_member = _family_expense_by_member(db, me.family_id, start, end)
    spent = sum((m["expense"] for m in by_member.values()), Decimal("0"))
    amount = Decimal(b.amount)
    ratio = float(spent / amount) if amount > 0 else 0.0
    return {
        "id": b.id,
        "amount": amount,
        "period": b.period,
        "spent": spent,
        "remaining": amount - spent,
        "usage_rate": round(ratio, 4),
        "over_budget": spent > amount,
    }


@router.put("/me/budget", response_model=FamilyBudgetResponse)
def upsert_family_budget(
    payload: FamilyBudgetUpsert,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> dict:
    me = _get_my_membership(db, current)
    _require_role(me, ("owner", "co_owner"))
    b = (
        db.query(FamilyBudget)
        .filter(FamilyBudget.family_id == me.family_id, FamilyBudget.period == payload.period)
        .first()
    )
    if b:
        b.amount = payload.amount
    else:
        b = FamilyBudget(family_id=me.family_id, amount=payload.amount, period=payload.period)
        db.add(b)
    db.commit()
    db.refresh(b)
    start, end = _current_month_bounds()
    by_member = _family_expense_by_member(db, me.family_id, start, end)
    spent = sum((m["expense"] for m in by_member.values()), Decimal("0"))
    amount = Decimal(b.amount)
    ratio = float(spent / amount) if amount > 0 else 0.0
    return {
        "id": b.id,
        "amount": amount,
        "period": b.period,
        "spent": spent,
        "remaining": amount - spent,
        "usage_rate": round(ratio, 4),
        "over_budget": spent > amount,
    }


# ─────────────────────────────────────────
# 家庭目标
# ─────────────────────────────────────────
@router.get("/me/goals", response_model=list[FamilyGoalResponse])
def list_family_goals(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[FamilyGoal]:
    me = _get_my_membership(db, current)
    return (
        db.query(FamilyGoal)
        .filter(FamilyGoal.family_id == me.family_id)
        .order_by(FamilyGoal.id)
        .all()
    )


@router.post("/me/goals", response_model=FamilyGoalResponse, status_code=status.HTTP_201_CREATED)
def create_family_goal(
    payload: FamilyGoalCreate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> FamilyGoal:
    me = _get_my_membership(db, current)
    _require_role(me, ("owner", "co_owner"))
    goal = FamilyGoal(family_id=me.family_id, **payload.model_dump())
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


@router.patch("/me/goals/{goal_id}", response_model=FamilyGoalResponse)
def update_family_goal(
    goal_id: int,
    payload: FamilyGoalUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> FamilyGoal:
    me = _get_my_membership(db, current)
    _require_role(me, ("owner", "co_owner"))
    goal = (
        db.query(FamilyGoal)
        .filter(FamilyGoal.id == goal_id, FamilyGoal.family_id == me.family_id)
        .first()
    )
    if not goal:
        raise HTTPException(status_code=404, detail="目标不存在")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(goal, k, v)
    db.commit()
    db.refresh(goal)
    return goal


@router.delete("/me/goals/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_family_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> None:
    me = _get_my_membership(db, current)
    _require_role(me, ("owner", "co_owner"))
    goal = (
        db.query(FamilyGoal)
        .filter(FamilyGoal.id == goal_id, FamilyGoal.family_id == me.family_id)
        .first()
    )
    if not goal:
        raise HTTPException(status_code=404, detail="目标不存在")
    db.delete(goal)
    db.commit()


@router.post("/me/goals/{goal_id}/contribute", response_model=FamilyGoalResponse)
def contribute_family_goal(
    goal_id: int,
    payload: FamilyGoalContribute,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> FamilyGoal:
    """所有成员都能 contribute,不限 role。"""
    me = _get_my_membership(db, current)
    goal = (
        db.query(FamilyGoal)
        .filter(FamilyGoal.id == goal_id, FamilyGoal.family_id == me.family_id)
        .first()
    )
    if not goal:
        raise HTTPException(status_code=404, detail="目标不存在")
    goal.current_amount = Decimal(goal.current_amount or 0) + payload.amount
    if Decimal(goal.current_amount) >= Decimal(goal.target_amount):
        goal.status = "completed"
    db.commit()
    db.refresh(goal)
    return goal


# ─────────────────────────────────────────
# 月度聚合 + 成员贡献
# ─────────────────────────────────────────
@router.get("/me/summary", response_model=FamilySummary)
def family_summary(
    month: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> dict:
    me = _get_my_membership(db, current)
    start, end = _month_bounds(month)
    by_member = _family_expense_by_member(db, me.family_id, start, end)

    members = (
        db.query(FamilyMember)
        .options(joinedload(FamilyMember.user))
        .filter(FamilyMember.family_id == me.family_id)
        .order_by(FamilyMember.id)
        .all()
    )

    contributions: list[MemberContribution] = []
    total_income = Decimal("0")
    total_expense = Decimal("0")
    for m in members:
        stats = by_member.get(m.user_id, {"income": Decimal("0"), "expense": Decimal("0")})
        total_income += stats["income"]
        total_expense += stats["expense"]
        contributions.append(
            MemberContribution(
                user_id=m.user_id,
                name=m.user.name or m.user.email,
                income=stats["income"],
                expense=stats["expense"],
            )
        )

    return {
        "family_id": me.family_id,
        "family_name": me.family.name,
        "month": month,
        "total_income": total_income,
        "total_expense": total_expense,
        "net": total_income - total_expense,
        "contributions": contributions,
    }

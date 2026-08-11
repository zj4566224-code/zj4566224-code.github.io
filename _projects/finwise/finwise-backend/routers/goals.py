from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models.goal import Goal
from models.user import User
from schemas.goal import GoalContribute, GoalCreate, GoalResponse, GoalUpdate

router = APIRouter()


@router.get("", response_model=list[GoalResponse])
def list_goals(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[Goal]:
    return db.query(Goal).filter(Goal.user_id == current.id).order_by(Goal.id).all()


@router.post("", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
def create_goal(
    payload: GoalCreate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Goal:
    g = Goal(user_id=current.id, **payload.model_dump())
    db.add(g)
    db.commit()
    db.refresh(g)
    return g


@router.put("/{goal_id}", response_model=GoalResponse)
def update_goal(
    goal_id: int,
    payload: GoalUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Goal:
    g = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == current.id).first()
    if not g:
        raise HTTPException(status_code=404, detail="目标不存在")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(g, k, v)
    db.commit()
    db.refresh(g)
    return g


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> None:
    g = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == current.id).first()
    if not g:
        raise HTTPException(status_code=404, detail="目标不存在")
    db.delete(g)
    db.commit()


@router.post("/{goal_id}/contribute", response_model=GoalResponse)
def contribute(
    goal_id: int,
    payload: GoalContribute,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> Goal:
    g = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == current.id).first()
    if not g:
        raise HTTPException(status_code=404, detail="目标不存在")
    g.current_amount = (g.current_amount or Decimal("0")) + payload.amount
    if g.current_amount >= g.target_amount:
        g.status = "completed"
    db.commit()
    db.refresh(g)
    return g

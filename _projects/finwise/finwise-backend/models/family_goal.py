from sqlalchemy import Column, Date, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import relationship
from database import Base


class FamilyGoal(Base):
    """家庭共担储蓄目标。current_amount 由成员共同贡献。"""

    __tablename__ = "family_goals"

    id = Column(Integer, primary_key=True, index=True)
    family_id = Column(Integer, ForeignKey("families.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    icon = Column(String(50))
    color = Column(String(20))
    target_amount = Column(Numeric(15, 2), nullable=False)
    current_amount = Column(Numeric(15, 2), default=0)
    deadline = Column(Date)
    status = Column(String(20), default="active")  # active / completed

    family = relationship("Family", back_populates="goals")

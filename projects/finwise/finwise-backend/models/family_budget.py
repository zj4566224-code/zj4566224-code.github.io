from sqlalchemy import Column, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.orm import relationship
from database import Base


class FamilyBudget(Base):
    """家庭总预算(v1 不分分类)。每个家庭 + period 唯一一条。"""

    __tablename__ = "family_budgets"

    id = Column(Integer, primary_key=True, index=True)
    family_id = Column(Integer, ForeignKey("families.id", ondelete="CASCADE"), nullable=False, index=True)
    amount = Column(Numeric(15, 2), nullable=False)
    period = Column(String(20), nullable=False, default="monthly")  # monthly / yearly

    __table_args__ = (UniqueConstraint("family_id", "period", name="uq_family_budget_period"),)

    family = relationship("Family", back_populates="budgets")

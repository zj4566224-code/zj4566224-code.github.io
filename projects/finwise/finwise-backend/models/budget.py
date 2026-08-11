from sqlalchemy import Column, Date, ForeignKey, Integer, Numeric, String
from database import Base


class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)  # NULL = 总预算
    amount = Column(Numeric(15, 2), nullable=False)
    period = Column(String(20), default="monthly")  # monthly / yearly
    start_date = Column(Date)

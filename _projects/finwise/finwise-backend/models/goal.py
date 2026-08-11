from sqlalchemy import Column, Date, ForeignKey, Integer, Numeric, String
from database import Base


class Goal(Base):
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    icon = Column(String(50))
    color = Column(String(20))
    target_amount = Column(Numeric(15, 2), nullable=False)
    current_amount = Column(Numeric(15, 2), default=0)
    deadline = Column(Date)
    status = Column(String(20), default="active")  # active / completed

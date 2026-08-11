from sqlalchemy import Column, Date, ForeignKey, Integer, Numeric, String
from database import Base


class Liability(Base):
    __tablename__ = "liabilities"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    type = Column(String(50))  # mortgage / credit / loan / other
    total_amount = Column(Numeric(15, 2))
    remaining = Column(Numeric(15, 2))
    interest_rate = Column(Numeric(5, 2))
    due_date = Column(Date)

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import relationship
from database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False, index=True)
    amount = Column(Numeric(15, 2), nullable=False)
    type = Column(String(10))  # income / expense / transfer
    date = Column(Date, nullable=False, index=True)
    note = Column(Text)
    is_recurring = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

    account = relationship("Account", back_populates="transactions")
    category = relationship("Category")

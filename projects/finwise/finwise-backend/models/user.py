from sqlalchemy import Column, DateTime, Integer, String, func
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(100))
    password_hash = Column(String, nullable=False)
    currency = Column(String(10), default="CNY")
    created_at = Column(DateTime, server_default=func.now())

    accounts = relationship("Account", back_populates="user", cascade="all, delete-orphan")
    categories = relationship("Category", cascade="all, delete-orphan")
    budgets = relationship("Budget", cascade="all, delete-orphan")
    assets = relationship("Asset", cascade="all, delete-orphan")
    liabilities = relationship("Liability", cascade="all, delete-orphan")
    goals = relationship("Goal", cascade="all, delete-orphan")

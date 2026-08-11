from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String, func
from database import Base


class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    type = Column(String(50))  # property / stock / fund / cash / other
    value = Column(Numeric(15, 2), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

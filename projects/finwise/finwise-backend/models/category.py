from sqlalchemy import Column, ForeignKey, Integer, String
from database import Base


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    type = Column(String(10))  # income / expense
    icon = Column(String(50))
    color = Column(String(20))
    parent_id = Column(Integer, ForeignKey("categories.id"), nullable=True)

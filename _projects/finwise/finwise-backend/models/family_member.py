from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import relationship
from database import Base


class FamilyMember(Base):
    __tablename__ = "family_members"

    id = Column(Integer, primary_key=True, index=True)
    family_id = Column(Integer, ForeignKey("families.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), nullable=False, default="member")  # owner / co_owner / member
    joined_at = Column(DateTime, server_default=func.now())

    # 一个用户同一时刻只能属于一个家庭
    __table_args__ = (UniqueConstraint("user_id", name="uq_family_members_user"),)

    family = relationship("Family", back_populates="members")
    user = relationship("User")

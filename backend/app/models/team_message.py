"""
TeamMessage Model - 团队消息模型
"""
from datetime import datetime
from typing import Optional
from sqlalchemy import String, JSON, DateTime, Integer, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class TeamMessage(Base):
    """TeamMessage model representing messages between team members"""

    __tablename__ = "team_messages"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    team_id: Mapped[int] = mapped_column(ForeignKey("agent_teams.id"), nullable=False, index=True)
    from_agent_id: Mapped[int] = mapped_column(Integer, nullable=False)
    to_agent_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # None = broadcast
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    content: Mapped[dict] = mapped_column(JSON, nullable=False)
    priority: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    def __repr__(self) -> str:
        return f"<TeamMessage(id={self.id}, team_id={self.team_id}, type='{self.type}')>"

"""
TeamState Model - 团队状态模型
"""
from datetime import datetime
from sqlalchemy import String, JSON, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class TeamState(Base):
    """TeamState model representing the current state of a team"""

    __tablename__ = "team_states"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    team_id: Mapped[int] = mapped_column(ForeignKey("agent_teams.id"), nullable=False, unique=True, index=True)
    status: Mapped[str] = mapped_column(String(20), default="idle", nullable=False)
    member_states: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    current_tasks: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    def __repr__(self) -> str:
        return f"<TeamState(id={self.id}, team_id={self.team_id}, status='{self.status}')>"

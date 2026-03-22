"""
Project 索引模型 — Open Adventure 仅存储元数据，实际配置在项目目录 .claude/ 与 web/。
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional, TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.agent import Agent


class Project(Base):
    """Git 工作区索引表"""

    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    path: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True, index=True)
    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    has_agent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    has_workspace: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    workspace_port: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    git_remote: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    git_branch: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    last_sync_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    meta: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON, nullable=True)

    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # 关联的 Project Agent（一对一关系）
    agent_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("agents.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    agent: Mapped[Optional["Agent"]] = relationship(
        "Agent",
        back_populates="projects",
        foreign_keys=[agent_id]
    )

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    def __repr__(self) -> str:
        return f"<Project(id={self.id}, name={self.name!r}, path={self.path!r})>"

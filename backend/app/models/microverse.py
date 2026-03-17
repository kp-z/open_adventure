"""
Microverse Character Model - 游戏角色与 Agent 绑定
"""
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Integer, Boolean, JSON, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.agent import Agent
    from app.models.task import Execution


class MicroverseCharacter(Base):
    """Microverse 游戏角色模型"""

    __tablename__ = "microverse_characters"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # 角色基本信息
    character_name: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
        comment="角色名称（游戏中的唯一标识）"
    )
    display_name: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        comment="显示名称"
    )

    # Agent 绑定（使用 ID）
    agent_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("agents.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="绑定的 Agent ID"
    )

    # 当前工作状态
    current_execution_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("executions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="当前正在执行的任务 ID"
    )

    is_working: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        comment="是否正在工作"
    )

    # 元数据
    meta: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    # Relationships
    agent: Mapped[Optional["Agent"]] = relationship(
        "Agent",
        foreign_keys=[agent_id]
    )
    current_execution: Mapped[Optional["Execution"]] = relationship(
        "Execution",
        foreign_keys=[current_execution_id]
    )

    def __repr__(self) -> str:
        return f"<MicroverseCharacter(id={self.id}, name='{self.character_name}', agent_id={self.agent_id}, is_working={self.is_working})>"

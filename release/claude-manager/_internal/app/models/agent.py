"""
Agent Model - Claude Code Subagent 数据模型

存储从本地文件系统扫描到的 agents 信息，
作为缓存层用于快速查询和前端展示
"""
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Boolean, Integer, JSON, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Agent(Base):
    """
    Claude Code Subagent 模型

    按照官方文档规范存储子代理配置：
    https://code.claude.com/docs/en/sub-agents
    """

    __tablename__ = "agents"

    # 主键
    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # 必填字段
    name: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    # 系统提示
    system_prompt: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # 模型配置
    model: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default="inherit")

    # 工具配置（JSON 数组）
    tools: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    disallowed_tools: Mapped[list] = mapped_column(JSON, default=list, nullable=False)

    # 权限模式
    permission_mode: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default="default")

    # 高级配置
    max_turns: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    skills: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    mcp_servers: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    hooks: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    memory: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    background: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    isolation: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # 作用域和优先级
    scope: Mapped[str] = mapped_column(String(50), nullable=False, default="user", index=True)
    priority: Mapped[int] = mapped_column(Integer, nullable=False, default=3)

    # 状态标记
    is_builtin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_overridden: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    override_info: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # 元数据（包含路径、颜色、图标等）
    meta: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # 时间戳
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    # 向后兼容字段（已弃用）
    capability_ids: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    source: Mapped[str] = mapped_column(String(100), nullable=False, default="user")

    def __repr__(self) -> str:
        return f"<Agent(id={self.id}, name='{self.name}', scope='{self.scope}')>"

"""
Plugin Model
"""
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Boolean, JSON, DateTime, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column
import enum

from app.core.database import Base


class PluginStatus(str, enum.Enum):
    """Plugin 状态"""
    INSTALLED = "installed"
    UPDATE_AVAILABLE = "update_available"
    INSTALLING = "installing"
    UPDATING = "updating"
    ERROR = "error"


class Plugin(Base):
    """Plugin 模型"""

    __tablename__ = "plugins"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(String(500))

    # Git 仓库信息
    git_repo_url: Mapped[str] = mapped_column(String(500))
    branch: Mapped[str] = mapped_column(String(100), default="main")

    # 版本信息
    local_commit_hash: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    remote_commit_hash: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)

    # 状态
    status: Mapped[PluginStatus] = mapped_column(
        SQLEnum(PluginStatus, native_enum=False),
        default=PluginStatus.INSTALLED
    )
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    # 路径信息
    local_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # 元数据
    meta: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # 最后检查更新时间
    last_check_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self) -> str:
        return f"<Plugin(id={self.id}, name='{self.name}', status='{self.status}')>"

"""
Skill Model
"""
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Boolean, JSON, DateTime, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column
import enum

from app.core.database import Base


class SkillSource(str, enum.Enum):
    """Skill source types"""
    GLOBAL = "global"
    PLUGIN = "plugin"
    PROJECT = "project"


class Skill(Base):
    """Skill model representing Claude Code skills"""

    __tablename__ = "skills"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    tags: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    source: Mapped[SkillSource] = mapped_column(
        SQLEnum(SkillSource, native_enum=False),
        default=SkillSource.GLOBAL,
        nullable=False
    )
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    meta: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

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

    def __repr__(self) -> str:
        return f"<Skill(id={self.id}, name='{self.name}', source='{self.source}')>"

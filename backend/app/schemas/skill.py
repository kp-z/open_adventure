"""
Skill Schemas
"""
from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field, ConfigDict

from app.models.skill import SkillSource


class SkillBase(BaseModel):
    """Base skill schema"""
    name: str = Field(..., min_length=1, max_length=100)
    full_name: str = Field(..., min_length=1, max_length=200)
    type: str = Field(..., min_length=1, max_length=50)
    description: str = Field(..., min_length=1, max_length=2000)
    tags: list[str] = Field(default_factory=list)
    source: SkillSource = Field(default=SkillSource.GLOBAL)
    enabled: bool = Field(default=True)
    meta: Optional[dict] = Field(default=None, description="元数据，plugin scope 需包含 plugin_name，project scope 需包含 project_path")


class SkillCreate(SkillBase):
    """Schema for creating a skill"""
    references: Optional[dict[str, str]] = Field(default=None, description="Reference files (filename: content)")
    scripts: Optional[dict[str, str]] = Field(default=None, description="Script files (filename: content)")
    scope: Literal["user", "project", "plugin"] = Field("user", description="创建位置：user, project 或 plugin")


class SkillUpdate(BaseModel):
    """Schema for updating a skill"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    full_name: Optional[str] = Field(None, min_length=1, max_length=200)
    type: Optional[str] = Field(None, min_length=1, max_length=50)
    description: Optional[str] = Field(None, min_length=1, max_length=2000)
    tags: Optional[list[str]] = None
    source: Optional[SkillSource] = None
    enabled: Optional[bool] = None
    meta: Optional[dict] = None
    scope: Optional[Literal["user", "project", "plugin"]] = None


class SkillResponse(SkillBase):
    """Schema for skill response"""
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SkillListResponse(BaseModel):
    """Schema for skill list response"""
    total: int
    items: list[SkillResponse]

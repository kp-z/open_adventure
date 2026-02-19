"""
Skill Schemas
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

from app.models.skill import SkillSource


class SkillBase(BaseModel):
    """Base skill schema"""
    name: str = Field(..., min_length=1, max_length=100)
    full_name: str = Field(..., min_length=1, max_length=200)
    type: str = Field(..., min_length=1, max_length=50)
    description: str = Field(..., min_length=1, max_length=500)
    tags: list[str] = Field(default_factory=list)
    source: SkillSource = Field(default=SkillSource.GLOBAL)
    enabled: bool = Field(default=True)
    meta: Optional[dict] = Field(default=None)


class SkillCreate(SkillBase):
    """Schema for creating a skill"""
    references: Optional[dict[str, str]] = Field(default=None, description="Reference files (filename: content)")
    scripts: Optional[dict[str, str]] = Field(default=None, description="Script files (filename: content)")


class SkillUpdate(BaseModel):
    """Schema for updating a skill"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    full_name: Optional[str] = Field(None, min_length=1, max_length=200)
    type: Optional[str] = Field(None, min_length=1, max_length=50)
    description: Optional[str] = Field(None, min_length=1, max_length=500)
    tags: Optional[list[str]] = None
    source: Optional[SkillSource] = None
    enabled: Optional[bool] = None
    meta: Optional[dict] = None


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

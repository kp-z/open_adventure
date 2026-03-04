"""
Plugin Schemas
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

from app.models.plugin import PluginStatus


class PluginBase(BaseModel):
    """Base plugin schema"""
    name: str = Field(..., min_length=1, max_length=100)
    display_name: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=500)
    git_repo_url: str = Field(..., min_length=1, max_length=500)
    branch: str = Field(default="main", min_length=1, max_length=100)


class PluginCreate(PluginBase):
    """Schema for creating a plugin"""
    local_path: Optional[str] = Field(None, max_length=500)
    local_commit_hash: Optional[str] = Field(None, max_length=40)


class PluginUpdate(BaseModel):
    """Schema for updating a plugin"""
    display_name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, min_length=1, max_length=500)
    git_repo_url: Optional[str] = Field(None, min_length=1, max_length=500)
    branch: Optional[str] = Field(None, min_length=1, max_length=100)
    local_commit_hash: Optional[str] = Field(None, max_length=40)
    remote_commit_hash: Optional[str] = Field(None, max_length=40)
    status: Optional[PluginStatus] = None
    enabled: Optional[bool] = None


class PluginResponse(PluginBase):
    """Schema for plugin response"""
    id: int
    local_commit_hash: Optional[str]
    remote_commit_hash: Optional[str]
    status: PluginStatus
    enabled: bool
    local_path: Optional[str]
    last_check_time: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PluginListResponse(BaseModel):
    """Schema for plugin list response"""
    total: int
    items: list[PluginResponse]

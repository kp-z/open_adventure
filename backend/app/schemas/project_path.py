"""
Project Path Schemas
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class ProjectPathBase(BaseModel):
    """Base schema for project path"""
    path: str = Field(..., description="项目路径")
    alias: Optional[str] = Field(None, description="项目别名")
    enabled: bool = Field(True, description="是否启用")
    recursive_scan: bool = Field(True, description="是否递归扫描")


class ProjectPathCreate(ProjectPathBase):
    """Schema for creating a project path"""
    pass


class ProjectPathUpdate(BaseModel):
    """Schema for updating a project path"""
    path: Optional[str] = Field(None, description="项目路径")
    alias: Optional[str] = Field(None, description="项目别名")
    enabled: Optional[bool] = Field(None, description="是否启用")
    recursive_scan: Optional[bool] = Field(None, description="是否递归扫描")


class ProjectPathResponse(ProjectPathBase):
    """Schema for project path response"""
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProjectPathListResponse(BaseModel):
    """Schema for project path list response"""
    total: int
    items: list[ProjectPathResponse]

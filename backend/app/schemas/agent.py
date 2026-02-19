"""
Agent Schemas
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class AgentBase(BaseModel):
    """Base agent schema"""
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1, max_length=500)
    system_prompt: Optional[str] = Field(None, max_length=5000)
    model: Optional[str] = Field(None, max_length=50)
    capability_ids: list[int] = Field(default_factory=list)
    source: str = Field(..., min_length=1, max_length=100)
    meta: Optional[dict] = Field(default=None)


class AgentCreate(AgentBase):
    """Schema for creating an agent"""
    pass


class AgentUpdate(BaseModel):
    """Schema for updating an agent"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, min_length=1, max_length=500)
    system_prompt: Optional[str] = Field(None, max_length=5000)
    model: Optional[str] = Field(None, max_length=50)
    capability_ids: Optional[list[int]] = None
    source: Optional[str] = Field(None, min_length=1, max_length=100)
    meta: Optional[dict] = None


class AgentResponse(AgentBase):
    """Schema for agent response"""
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AgentListResponse(BaseModel):
    """Schema for agent list response"""
    total: int
    items: list[AgentResponse]

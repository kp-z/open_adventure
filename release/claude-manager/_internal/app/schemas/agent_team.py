"""
AgentTeam Schemas
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class AgentTeamMember(BaseModel):
    """Schema for agent team member"""
    agent_id: int
    role: str = Field(..., min_length=1, max_length=100)
    priority: int = Field(default=0)


class AgentTeamBase(BaseModel):
    """Base agent team schema"""
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1, max_length=500)
    members: list[AgentTeamMember] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    meta: Optional[dict] = Field(default=None)


class AgentTeamCreate(AgentTeamBase):
    """Schema for creating an agent team"""
    pass


class AgentTeamUpdate(BaseModel):
    """Schema for updating an agent team"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, min_length=1, max_length=500)
    members: Optional[list[AgentTeamMember]] = None
    tags: Optional[list[str]] = None
    meta: Optional[dict] = None


class AgentTeamResponse(AgentTeamBase):
    """Schema for agent team response"""
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AgentTeamListResponse(BaseModel):
    """Schema for agent team list response"""
    total: int
    items: list[AgentTeamResponse]

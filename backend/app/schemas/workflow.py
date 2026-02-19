"""
Workflow Schemas
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

from app.models.workflow import WorkflowNodeType


class WorkflowNodeBase(BaseModel):
    """Base workflow node schema"""
    name: str = Field(..., min_length=1, max_length=100)
    type: WorkflowNodeType
    agent_team_id: Optional[int] = None
    preferred_agent_ids: list[int] = Field(default_factory=list)
    capability_filter_ids: list[int] = Field(default_factory=list)
    config: Optional[dict] = None
    position_x: Optional[int] = None
    position_y: Optional[int] = None


class WorkflowNodeCreate(WorkflowNodeBase):
    """Schema for creating a workflow node"""
    pass


class WorkflowNodeResponse(WorkflowNodeBase):
    """Schema for workflow node response"""
    id: int
    workflow_id: int

    model_config = ConfigDict(from_attributes=True)


class WorkflowEdgeBase(BaseModel):
    """Base workflow edge schema"""
    from_node_id: int
    to_node_id: int
    condition: Optional[str] = Field(None, max_length=500)


class WorkflowEdgeCreate(WorkflowEdgeBase):
    """Schema for creating a workflow edge"""
    pass


class WorkflowEdgeResponse(WorkflowEdgeBase):
    """Schema for workflow edge response"""
    id: int
    workflow_id: int

    model_config = ConfigDict(from_attributes=True)


class WorkflowBase(BaseModel):
    """Base workflow schema"""
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1, max_length=500)
    version: str = Field(..., min_length=1, max_length=20)
    active: bool = Field(default=True)
    meta: Optional[dict] = None


class WorkflowCreate(WorkflowBase):
    """Schema for creating a workflow"""
    nodes: list[WorkflowNodeCreate] = Field(default_factory=list)
    edges: list[WorkflowEdgeCreate] = Field(default_factory=list)


class WorkflowUpdate(BaseModel):
    """Schema for updating a workflow"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, min_length=1, max_length=500)
    version: Optional[str] = Field(None, min_length=1, max_length=20)
    active: Optional[bool] = None
    meta: Optional[dict] = None


class WorkflowResponse(WorkflowBase):
    """Schema for workflow response"""
    id: int
    nodes: list[WorkflowNodeResponse] = Field(default_factory=list)
    edges: list[WorkflowEdgeResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WorkflowListResponse(BaseModel):
    """Schema for workflow list response"""
    total: int
    items: list[WorkflowResponse]


class WorkflowTemplateBase(BaseModel):
    """Base workflow template schema"""
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1, max_length=500)
    category: Optional[str] = Field(None, max_length=100)
    workflow_data: dict = Field(..., description="Complete workflow structure including nodes and edges")
    is_public: bool = Field(default=True)


class WorkflowTemplateCreate(WorkflowTemplateBase):
    """Schema for creating a workflow template"""
    pass


class WorkflowTemplateUpdate(BaseModel):
    """Schema for updating a workflow template"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, min_length=1, max_length=500)
    category: Optional[str] = Field(None, max_length=100)
    workflow_data: Optional[dict] = None
    is_public: Optional[bool] = None


class WorkflowTemplateResponse(WorkflowTemplateBase):
    """Schema for workflow template response"""
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WorkflowTemplateListResponse(BaseModel):
    """Schema for workflow template list response"""
    total: int
    items: list[WorkflowTemplateResponse]

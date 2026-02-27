"""
Task Schemas
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

from app.models.task import TaskStatus, ExecutionStatus


class TaskBase(BaseModel):
    """Base task schema"""
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=2000)
    project_path: Optional[str] = Field(None, max_length=500)
    workflow_id: Optional[int] = None
    agent_team_id: Optional[int] = None
    meta: Optional[dict] = None


class TaskCreate(TaskBase):
    """Schema for creating a task"""
    pass


class TaskUpdate(BaseModel):
    """Schema for updating a task"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, min_length=1, max_length=2000)
    project_path: Optional[str] = Field(None, max_length=500)
    workflow_id: Optional[int] = None
    agent_team_id: Optional[int] = None
    status: Optional[TaskStatus] = None
    meta: Optional[dict] = None


class TaskResponse(TaskBase):
    """Schema for task response"""
    id: int
    status: TaskStatus
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TaskListResponse(BaseModel):
    """Schema for task list response"""
    total: int
    items: list[TaskResponse]


class NodeExecutionBase(BaseModel):
    """Base node execution schema"""
    node_id: int
    status: ExecutionStatus
    logs_path: Optional[str] = None
    output_summary: Optional[str] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None


class NodeExecutionResponse(NodeExecutionBase):
    """Schema for node execution response"""
    id: int
    execution_id: int

    model_config = ConfigDict(from_attributes=True)


class ExecutionBase(BaseModel):
    """Base execution schema"""
    workflow_id: int
    status: ExecutionStatus
    meta: Optional[dict] = None


class ExecutionCreate(ExecutionBase):
    """Schema for creating an execution"""
    task_id: int


class ExecutionResponse(ExecutionBase):
    """Schema for execution response"""
    id: int
    task_id: int
    node_executions: list[NodeExecutionResponse] = Field(default_factory=list)
    created_at: datetime
    finished_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ExecutionListResponse(BaseModel):
    """Schema for execution list response"""
    total: int
    items: list[ExecutionResponse]

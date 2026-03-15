"""
Task Schemas - 支持 Plan 的任务管理
"""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

from app.models.task import TaskStatus, TaskType, ExecutionStatus


class TaskBase(BaseModel):
    """Base task schema"""
    title: str = Field(..., min_length=1, max_length=200, description="任务标题")
    description: str = Field(..., min_length=1, max_length=2000, description="任务描述")
    task_type: TaskType = Field(default=TaskType.SINGLE_AGENT, description="任务类型")
    project_path: Optional[str] = Field(None, max_length=500, description="项目路径")
    workflow_id: Optional[int] = Field(None, description="工作流ID")
    agent_team_id: Optional[int] = Field(None, description="Agent团队ID")
    agent_id: Optional[int] = Field(None, description="Agent ID")
    auto_generate_plan: bool = Field(default=True, description="是否自动生成计划")
    plan_template_id: Optional[int] = Field(None, description="计划模板ID")
    input_parameters: Optional[Dict[str, Any]] = Field(None, description="输入参数")
    execution_config: Optional[Dict[str, Any]] = Field(None, description="执行配置")
    priority: int = Field(default=5, ge=1, le=10, description="优先级")
    scheduled_at: Optional[datetime] = Field(None, description="计划执行时间")
    deadline: Optional[datetime] = Field(None, description="截止时间")
    tags: List[str] = Field(default_factory=list, description="标签列表")
    category: Optional[str] = Field(None, description="分类")
    meta: Optional[dict] = Field(None, description="元数据")


class TaskCreate(TaskBase):
    """Schema for creating a task"""
    pass


class TaskUpdate(BaseModel):
    """Schema for updating a task"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, min_length=1, max_length=2000)
    task_type: Optional[TaskType] = None
    project_path: Optional[str] = Field(None, max_length=500)
    workflow_id: Optional[int] = None
    agent_team_id: Optional[int] = None
    agent_id: Optional[int] = None
    current_plan_id: Optional[int] = None
    auto_generate_plan: Optional[bool] = None
    plan_template_id: Optional[int] = None
    input_parameters: Optional[Dict[str, Any]] = None
    execution_config: Optional[Dict[str, Any]] = None
    priority: Optional[int] = Field(None, ge=1, le=10)
    scheduled_at: Optional[datetime] = None
    deadline: Optional[datetime] = None
    status: Optional[TaskStatus] = None
    tags: Optional[List[str]] = None
    category: Optional[str] = None
    meta: Optional[dict] = None


class TaskResponse(TaskBase):
    """Schema for task response"""
    id: int
    status: TaskStatus
    current_plan_id: Optional[int] = None
    execution_count: int
    success_count: int
    failure_count: int
    result_data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    # 计算属性
    is_executable: bool = Field(default=False, description="是否可以执行")
    needs_plan: bool = Field(default=False, description="是否需要生成计划")
    success_rate: float = Field(default=0.0, description="成功率")

    model_config = ConfigDict(from_attributes=True)


class TaskListResponse(BaseModel):
    """Schema for task list response"""
    total: int
    items: List[TaskResponse]


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
    node_executions: List[NodeExecutionResponse] = Field(default_factory=list)
    created_at: datetime
    finished_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ExecutionListResponse(BaseModel):
    """Schema for execution list response"""
    total: int
    items: List[ExecutionResponse]

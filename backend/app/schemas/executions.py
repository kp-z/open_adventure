"""
执行相关的 Pydantic schemas
"""
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, ConfigDict

from app.models.task import ExecutionStatus, ExecutionType


class NodeExecutionResponse(BaseModel):
    """节点执行响应"""
    id: int
    execution_id: int
    node_id: int
    status: ExecutionStatus
    started_at: datetime
    finished_at: Optional[datetime] = None
    output: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ExecutionResponse(BaseModel):
    """执行响应"""
    id: int
    task_id: int
    workflow_id: int
    status: ExecutionStatus
    execution_type: ExecutionType
    agent_id: Optional[int] = None
    test_input: Optional[str] = None
    test_output: Optional[str] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    # Terminal 相关字段
    terminal_pid: Optional[int] = None
    terminal_command: Optional[str] = None
    terminal_cwd: Optional[str] = None
    terminal_output: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ExecutionListResponse(BaseModel):
    """执行列表响应"""
    items: List[ExecutionResponse]
    total: int
    skip: int
    limit: int


class TerminalExecutionCreate(BaseModel):
    """创建 Terminal 执行记录"""
    command: str
    cwd: str
    pid: Optional[int] = None


class TerminalExecutionUpdate(BaseModel):
    """更新 Terminal 执行记录"""
    status: Optional[ExecutionStatus] = None
    output: Optional[str] = None
    error_message: Optional[str] = None

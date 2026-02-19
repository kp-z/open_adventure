"""
执行相关的 Pydantic schemas
"""
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, ConfigDict

from app.models.task import ExecutionStatus


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
    started_at: datetime
    finished_at: Optional[datetime] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ExecutionListResponse(BaseModel):
    """执行列表响应"""
    items: List[ExecutionResponse]
    total: int
    skip: int
    limit: int

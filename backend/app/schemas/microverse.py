"""
Microverse Schemas - Pydantic 模型
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


# ===== Character Schemas =====

class MicroverseCharacterBase(BaseModel):
    """角色基础模型"""
    character_name: str = Field(..., max_length=100, description="角色名称（游戏中的唯一标识）")
    display_name: Optional[str] = Field(None, max_length=100, description="显示名称")
    meta: Optional[dict] = Field(None, description="元数据")


class MicroverseCharacterCreate(MicroverseCharacterBase):
    """创建角色请求"""
    agent_id: Optional[int] = Field(None, description="绑定的 Agent ID")


class MicroverseCharacterUpdate(BaseModel):
    """更新角色请求"""
    display_name: Optional[str] = Field(None, max_length=100, description="显示名称")
    meta: Optional[dict] = Field(None, description="元数据")


class MicroverseCharacterBindAgent(BaseModel):
    """绑定 Agent 请求"""
    agent_id: int = Field(..., description="要绑定的 Agent ID")


class MicroverseCharacterResponse(MicroverseCharacterBase):
    """角色响应"""
    id: int
    agent_id: Optional[int]
    current_execution_id: Optional[int]
    is_working: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MicroverseCharacterDetailResponse(MicroverseCharacterResponse):
    """角色详细信息响应（包含关联的 Agent 信息）"""
    agent: Optional[dict] = Field(None, description="绑定的 Agent 信息")
    current_execution: Optional[dict] = Field(None, description="当前执行的任务信息")


# ===== Work Schemas =====

class StartWorkRequest(BaseModel):
    """启动工作请求"""
    task_description: str = Field(..., max_length=5000, description="任务描述")
    project_path: Optional[str] = Field(None, max_length=500, description="项目路径")


class WorkStatusResponse(BaseModel):
    """工作状态响应"""
    status: str = Field(..., description="执行状态")
    pid: Optional[int] = Field(None, description="进程 PID")
    started_at: Optional[datetime] = Field(None, description="开始时间")
    cpu_percent: Optional[float] = Field(None, description="CPU 使用率")
    memory_mb: Optional[float] = Field(None, description="内存使用（MB）")


class WorkLogsResponse(BaseModel):
    """工作日志响应"""
    logs: list[str] = Field(..., description="日志列表")
    total: int = Field(..., description="总日志数")
    has_more: bool = Field(..., description="是否还有更多日志")

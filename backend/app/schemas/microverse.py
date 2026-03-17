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


# ===== Conversation Schemas =====

class ConversationCreateRequest(BaseModel):
    """创建对话会话请求"""
    character_name: str = Field(..., max_length=100, description="角色名称")
    context: Optional[dict] = Field(None, description="对话上下文")


class ConversationResponse(BaseModel):
    """对话会话响应"""
    session_id: str = Field(..., description="会话 ID")
    character_name: str = Field(..., description="角色名称")
    agent_id: Optional[int] = Field(None, description="绑定的 Agent ID")
    created_at: datetime = Field(..., description="创建时间")
    last_activity_at: datetime = Field(..., description="最后活动时间")


class MessageSendRequest(BaseModel):
    """发送消息请求"""
    message: str = Field(..., max_length=5000, description="消息内容")
    context: Optional[dict] = Field(None, description="消息上下文")


class MessageResponse(BaseModel):
    """消息响应"""
    message_id: str = Field(..., description="消息 ID")
    role: str = Field(..., description="角色（user/assistant）")
    content: str = Field(..., description="消息内容")
    timestamp: datetime = Field(..., description="时间戳")


class ConversationHistoryResponse(BaseModel):
    """对话历史响应"""
    session_id: str = Field(..., description="会话 ID")
    messages: list[MessageResponse] = Field(..., description="消息列表")
    total: int = Field(..., description="总消息数")


# ===== Task Control Schemas =====

class TaskControlResponse(BaseModel):
    """任务控制响应"""
    success: bool = Field(..., description="操作是否成功")
    execution_id: int = Field(..., description="执行 ID")
    status: str = Field(..., description="当前状态")
    message: Optional[str] = Field(None, description="响应消息")


# ===== Question Answer Schemas =====

class QuestionAnswerRequest(BaseModel):
    """询问响应请求"""
    answer: str = Field(..., max_length=5000, description="用户答案")
    timeout: Optional[int] = Field(None, description="超时时间（秒）")


class QuestionAnswerResponse(BaseModel):
    """询问响应响应"""
    success: bool = Field(..., description="提交是否成功")
    question_id: str = Field(..., description="问题 ID")
    execution_id: int = Field(..., description="执行 ID")


# ===== Session Persistence Schemas =====

class SessionSaveRequest(BaseModel):
    """保存会话请求"""
    session_id: str = Field(..., description="会话 ID")
    session_data: dict = Field(..., description="会话数据")


class SessionSaveResponse(BaseModel):
    """保存会话响应"""
    success: bool = Field(..., description="保存是否成功")
    session_id: str = Field(..., description="会话 ID")
    saved_at: datetime = Field(..., description="保存时间")


class SessionRestoreRequest(BaseModel):
    """恢复会话请求"""
    session_id: str = Field(..., description="会话 ID")


class SessionRestoreResponse(BaseModel):
    """恢复会话响应"""
    success: bool = Field(..., description="恢复是否成功")
    session_id: str = Field(..., description="会话 ID")
    session_data: dict = Field(..., description="会话数据")
    saved_at: datetime = Field(..., description="保存时间")

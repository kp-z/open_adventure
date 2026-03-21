"""Project API Pydantic schemas."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class ProjectBase(BaseModel):
    name: str = Field(..., max_length=200)
    path: str = Field(..., max_length=1024)
    description: Optional[str] = Field(None, max_length=500)


class ProjectCreate(ProjectBase):
    """创建索引；可选跳过磁盘初始化"""


class ProjectCreateFromPath(BaseModel):
    """从绝对路径创建索引"""

    path: str = Field(..., max_length=1024)
    name: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = Field(None, max_length=500)


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = Field(None, max_length=500)
    workspace_port: Optional[int] = None
    meta: Optional[dict[str, Any]] = None


class ProjectResponse(BaseModel):
    id: int
    name: str
    path: str
    description: Optional[str]
    has_agent: bool
    has_workspace: bool = Field(
        ...,
        description="磁盘上是否存在 web/package.json（不代表已执行扫描写入 config）",
    )
    workspace_scanned: bool = Field(
        default=False,
        description=".claude/config.json 中 workspace.scanned 为真，表示已完成 Init Workspace 扫描",
    )
    workspace_port: Optional[int]
    git_remote: Optional[str]
    git_branch: Optional[str]
    last_sync_at: Optional[datetime]
    meta: Optional[dict[str, Any]]
    agent_id: Optional[int] = None  # 关联的 Project Agent ID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProjectListResponse(BaseModel):
    items: list[ProjectResponse]
    total: int
    skip: int
    limit: int


class WorkspaceStatusResponse(BaseModel):
    """Workspace 开发服务状态"""

    running: bool
    url: Optional[str] = None
    port: Optional[int] = None
    pid: Optional[int] = None
    started_at: Optional[str] = None
    health: str = "unknown"  # healthy | unhealthy | unknown
    last_error: Optional[str] = None
    phase: str = "stopped"  # stopped | starting | running | stopping | error


class ProjectScanRequest(BaseModel):
    """扫描目录下 Git 仓库"""

    root_path: str = Field(..., max_length=1024)
    max_depth: int = Field(4, ge=1, le=12)


class ProjectScanResult(BaseModel):
    discovered: list[str]
    created_ids: list[int]


class ClaudeConfigUpdate(BaseModel):
    """合并写入 .claude/config.json 的片段"""

    raw: dict[str, Any]


class AgentMarkdownBody(BaseModel):
    """更新 .claude/agent.md 正文"""

    content: str = Field(..., min_length=0)


class WorkspaceConfig(BaseModel):
    """Workspace 配置（存储于 .claude/config.json）"""

    enabled: bool = False
    port: Optional[int] = None
    auto_start: bool = False
    frontend_entry: Optional[str] = None  # 前端入口目录
    start_command: Optional[str] = None   # 启动命令
    framework: Optional[str] = None       # 检测到的框架
    package_manager: Optional[str] = None # 包管理器
    scanned: bool = False                 # 是否已扫描
    scanned_at: Optional[datetime] = None # 扫描时间


class BindAgentRequest(BaseModel):
    """绑定 Agent 请求"""

    agent_id: int = Field(..., gt=0)


class ScanResultResponse(BaseModel):
    """扫描结果响应"""

    success: bool
    workspace_config: WorkspaceConfig
    message: Optional[str] = None


class ScreenshotResponse(BaseModel):
    """截图响应"""

    success: bool
    path: Optional[str] = None
    message: Optional[str] = None


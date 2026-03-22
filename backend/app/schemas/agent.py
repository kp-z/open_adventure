"""
Agent Schemas - 统一的 Agent API 接口定义

支持 Claude Code 和 OpenClaw 两种框架的 Agent 配置
根据 https://code.claude.com/docs/en/sub-agents 和 OpenClaw 文档定义
"""
from __future__ import annotations

from datetime import datetime
from typing import List, Literal, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict, validator

from app.models.agent import AgentFramework, AgentType


class AgentHook(BaseModel):
    """子代理钩子配置"""
    type: str = Field(..., description="钩子类型：command")
    command: str = Field(..., description="执行的命令")


class AgentHookMatcher(BaseModel):
    """子代理钩子匹配器"""
    matcher: Optional[str] = Field(None, description="工具名称匹配模式")
    hooks: List[AgentHook] = Field(default_factory=list)


class AgentHooks(BaseModel):
    """子代理钩子配置"""
    PreToolUse: Optional[List[AgentHookMatcher]] = Field(None, description="工具使用前钩子")
    PostToolUse: Optional[List[AgentHookMatcher]] = Field(None, description="工具使用后钩子")
    Stop: Optional[List[AgentHookMatcher]] = Field(None, description="停止时钩子")


class AgentOverrideInfo(BaseModel):
    """子代理覆盖信息"""
    count: int = Field(..., description="同名 agent 数量")
    scopes: List[str] = Field(default_factory=list, description="所有同名 agent 的作用域")
    active_scope: str = Field(..., description="当前激活的作用域")


class AgentBase(BaseModel):
    """
    统一的 Agent 基础 Schema

    支持 Claude Code 和 OpenClaw 两种框架
    """
    # 必填字段
    name: str = Field(..., min_length=1, max_length=100, description="Agent 名称")
    description: str = Field("", max_length=100000, description="Agent 描述")

    # 框架和类型
    framework: AgentFramework = Field(
        AgentFramework.CLAUDE_CODE,
        description="AI 框架：claude_code, openclaw, hybrid"
    )
    agent_type: AgentType = Field(
        AgentType.SUBAGENT,
        description="Agent 类型：subagent, session, workflow, terminal"
    )

    # 系统提示（通用字段）
    system_prompt: Optional[str] = Field(None, max_length=100000, description="系统提示词")

    # 模型选择（通用字段）
    model: Optional[str] = Field(
        "inherit",
        max_length=50,
        description="模型：sonnet, opus, haiku, 或 inherit"
    )

    # === Claude Code 专用字段 ===
    tools: List[str] = Field(
        default_factory=list,
        description="允许使用的工具列表"
    )
    disallowed_tools: List[str] = Field(
        default_factory=list,
        description="禁止使用的工具列表"
    )
    permission_mode: Optional[str] = Field(
        "default",
        description="权限模式：default, acceptEdits, dontAsk, bypassPermissions, plan"
    )
    max_turns: Optional[int] = Field(None, description="最大轮次限制")
    memory: Optional[str] = Field(None, description="持久化内存作用域：user, project, local")
    background: bool = Field(False, description="是否后台运行")
    isolation: Optional[str] = Field(None, description="隔离模式：worktree")

    # === OpenClaw 专用字段 ===
    persist: Optional[str] = Field(None, description="持久化配置：true, project, custom")
    context: Optional[Dict[str, Any]] = Field(None, description="上下文配置")
    retry: Optional[int] = Field(3, description="重试次数")
    backoff: Optional[str] = Field("exponential", description="退避策略：none, linear, exponential")
    permissions: List[str] = Field(default_factory=list, description="OpenClaw 权限列表")

    # === 通用字段 ===
    skills: List[str] = Field(default_factory=list, description="预加载的技能列表")
    mcp_servers: list = Field(default_factory=list, description="MCP 服务器配置")
    hooks: Optional[dict] = Field(None, description="生命周期钩子")

    # 作用域和优先级
    scope: Literal["builtin", "user", "project", "plugin"] = Field(
        "user",
        description="作用域：builtin, user, project, plugin"
    )
    priority: int = Field(3, description="优先级（数字越小越高）")

    # 分类和标签
    category: Optional[str] = Field(None, description="分类")
    tags: List[str] = Field(default_factory=list, description="标签列表")

    # 模板
    template_id: Optional[int] = Field(None, description="基于的模板 ID")

    # 状态标记
    is_builtin: bool = Field(False, description="是否内置")
    is_active: bool = Field(True, description="是否激活")
    is_overridden: bool = Field(False, description="是否被更高优先级覆盖")
    override_info: Optional[AgentOverrideInfo] = Field(None, description="覆盖信息")

    # 元数据
    meta: Optional[dict] = Field(default=None, description="其他元数据")


class AgentCreate(BaseModel):
    """
    创建 Agent Schema

    支持创建 Claude Code 或 OpenClaw Agent
    """
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1, max_length=100000)
    framework: AgentFramework = Field(AgentFramework.CLAUDE_CODE)
    agent_type: AgentType = Field(AgentType.SUBAGENT)
    system_prompt: Optional[str] = Field(None, max_length=100000)
    model: Optional[str] = Field("inherit", max_length=50)

    # Claude Code 字段
    tools: List[str] = Field(default_factory=list)
    disallowed_tools: List[str] = Field(default_factory=list)
    permission_mode: Optional[str] = Field("default")
    max_turns: Optional[int] = Field(None)
    memory: Optional[str] = Field(None)
    background: bool = Field(False)
    isolation: Optional[str] = Field(None)

    # OpenClaw 字段
    persist: Optional[str] = Field(None)
    context: Optional[Dict[str, Any]] = Field(None)
    retry: Optional[int] = Field(3)
    backoff: Optional[str] = Field("exponential")
    permissions: List[str] = Field(default_factory=list)

    # 通用字段
    skills: List[str] = Field(default_factory=list)
    mcp_servers: list = Field(default_factory=list)
    hooks: Optional[dict] = Field(None)
    scope: Literal["user", "project"] = Field("user")
    priority: int = Field(3)
    category: Optional[str] = Field(None)
    tags: List[str] = Field(default_factory=list)
    template_id: Optional[int] = Field(None)
    meta: Optional[dict] = Field(None)


class AgentUpdate(BaseModel):
    """更新 Agent Schema"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=100000)
    framework: Optional[AgentFramework] = None
    agent_type: Optional[AgentType] = None
    system_prompt: Optional[str] = Field(None, max_length=100000)
    model: Optional[str] = Field(None, max_length=50)

    # Claude Code 字段
    tools: Optional[List[str]] = None
    disallowed_tools: Optional[List[str]] = None
    permission_mode: Optional[str] = None
    max_turns: Optional[int] = None
    memory: Optional[str] = None
    background: Optional[bool] = None
    isolation: Optional[str] = None

    # OpenClaw 字段
    persist: Optional[str] = None
    context: Optional[Dict[str, Any]] = None
    retry: Optional[int] = None
    backoff: Optional[str] = None
    permissions: Optional[List[str]] = None

    # 通用字段
    skills: Optional[List[str]] = None
    mcp_servers: Optional[list] = None
    hooks: Optional[dict] = None
    scope: Optional[Literal["user", "project", "plugin"]] = None
    priority: Optional[int] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    is_active: Optional[bool] = None
    meta: Optional[dict] = None


class AgentResponse(AgentBase):
    """子代理响应 Schema"""
    id: int
    created_at: datetime
    updated_at: datetime
    resolved_model: Optional[str] = Field(None, description="实际使用的模型（inherit 时解析后的值）")

    model_config = ConfigDict(from_attributes=True)


class AgentListResponse(BaseModel):
    """子代理列表响应 Schema"""
    total: int
    items: List[AgentResponse]
    builtin_count: int = Field(0, description="内置子代理数量")
    user_count: int = Field(0, description="用户级子代理数量")
    project_count: int = Field(0, description="项目级子代理数量")
    plugin_count: int = Field(0, description="插件级子代理数量")


class AgentSyncRequest(BaseModel):
    """同步子代理请求"""
    project_path: Optional[str] = Field(None, description="项目路径，用于扫描项目级 agents")
    include_builtin: bool = Field(True, description="是否包含内置 agents")


class AgentSyncResponse(BaseModel):
    """同步子代理响应"""
    synced: int = Field(..., description="同步的数量")
    created: int = Field(0, description="新创建的数量")
    updated: int = Field(0, description="更新的数量")
    deleted: int = Field(0, description="删除的数量")
    errors: List[str] = Field(default_factory=list, description="错误信息")


class AgentGenerateRequest(BaseModel):
    """
    使用 Claude 生成子代理请求

    参考 /agents 命令的 "Generate with Claude" 功能
    """
    prompt: str = Field(..., min_length=10, max_length=2000, description="描述子代理的用途和行为")
    scope: Literal["user", "project"] = Field("user", description="创建位置：user 或 project")
    model: Optional[str] = Field("sonnet", description="使用的模型")
    tools_preset: Optional[str] = Field(
        None,
        description="工具预设：readonly (只读), all (全部), custom"
    )


class AgentGenerateResponse(BaseModel):
    """使用 Claude 生成子代理响应"""
    name: str
    description: str
    system_prompt: str
    model: str
    tools: List[str]
    suggested_filename: str
    preview_content: str = Field(..., description="完整的 Markdown 文件预览内容")


class AgentFileContent(BaseModel):
    """子代理文件内容（用于编辑）"""
    path: str = Field(..., description="文件路径")
    content: str = Field(..., description="完整的 Markdown 内容（YAML frontmatter + body）")
    frontmatter: dict = Field(default_factory=dict, description="解析后的 frontmatter")
    body: str = Field("", description="系统提示（Markdown body）")


class SavePlanRequest(BaseModel):
    """保存 Agent Plan/Report 请求"""
    session_id: str = Field(..., description="会话 ID")
    message_id: str = Field(..., description="消息 ID")
    content: str = Field(..., description="Markdown 内容")
    content_type: Literal["plan", "report", "conversation"] = Field(..., description="内容类型")


class UpdatePlanRequest(BaseModel):
    """更新 Plan/Report 请求"""
    content: str = Field(..., description="更新后的 Markdown 内容")


class SavePlanResponse(BaseModel):
    """保存 Plan 响应"""
    success: bool
    file_path: str
    file_url: str

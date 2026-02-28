"""
Agent Schemas - 匹配 Claude Code 官方 Subagent 规范

根据 https://code.claude.com/docs/en/sub-agents 文档定义
"""
from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field, ConfigDict


class AgentHook(BaseModel):
    """子代理钩子配置"""
    type: str = Field(..., description="钩子类型：command")
    command: str = Field(..., description="执行的命令")


class AgentHookMatcher(BaseModel):
    """子代理钩子匹配器"""
    matcher: Optional[str] = Field(None, description="工具名称匹配模式")
    hooks: list[AgentHook] = Field(default_factory=list)


class AgentHooks(BaseModel):
    """子代理钩子配置"""
    PreToolUse: Optional[list[AgentHookMatcher]] = Field(None, description="工具使用前钩子")
    PostToolUse: Optional[list[AgentHookMatcher]] = Field(None, description="工具使用后钩子")
    Stop: Optional[list[AgentHookMatcher]] = Field(None, description="停止时钩子")


class AgentOverrideInfo(BaseModel):
    """子代理覆盖信息"""
    count: int = Field(..., description="同名 agent 数量")
    scopes: list[str] = Field(default_factory=list, description="所有同名 agent 的作用域")
    active_scope: str = Field(..., description="当前激活的作用域")


class AgentBase(BaseModel):
    """
    Claude Code 子代理基础 Schema

    包含所有官方支持的配置项
    """
    # 必填字段
    name: str = Field(..., min_length=1, max_length=100, description="唯一标识符，小写字母和连字符")
    description: str = Field("", max_length=100000, description="Claude 何时委托给此子代理")

    # 系统提示（Markdown body）
    system_prompt: Optional[str] = Field(None, max_length=100000, description="系统提示词")

    # 模型选择
    model: Optional[str] = Field(
        "inherit",
        max_length=50,
        description="模型：sonnet, opus, haiku, 或 inherit"
    )

    # 工具控制
    tools: list[str] = Field(
        default_factory=list,
        description="允许使用的工具列表，为空则继承所有"
    )
    disallowed_tools: list[str] = Field(
        default_factory=list,
        description="禁止使用的工具列表"
    )

    # 权限模式
    permission_mode: Optional[str] = Field(
        "default",
        description="权限模式：default, acceptEdits, dontAsk, bypassPermissions, plan"
    )

    # 高级配置
    max_turns: Optional[int] = Field(None, description="最大轮次限制")
    skills: list[str] = Field(default_factory=list, description="预加载的技能列表")
    mcp_servers: list = Field(default_factory=list, description="MCP 服务器配置")
    hooks: Optional[dict] = Field(None, description="生命周期钩子")
    memory: Optional[str] = Field(None, description="持久化内存作用域：user, project, local")
    background: bool = Field(False, description="是否后台运行")
    isolation: Optional[str] = Field(None, description="隔离模式：worktree")

    # 作用域信息
    scope: Literal["builtin", "user", "project", "plugin"] = Field(
        "user",
        description="作用域：builtin, user, project, plugin"
    )
    priority: int = Field(3, description="优先级（数字越小越高）")

    # 状态标记
    is_builtin: bool = Field(False, description="是否内置")
    is_active: bool = Field(True, description="是否激活（未被覆盖）")
    is_overridden: bool = Field(False, description="是否被更高优先级覆盖")
    override_info: Optional[AgentOverrideInfo] = Field(None, description="覆盖信息")

    # 元数据
    meta: Optional[dict] = Field(default=None, description="其他元数据")


class AgentCreate(BaseModel):
    """
    创建子代理 Schema

    用于在用户级或项目级创建新的子代理
    """
    name: str = Field(..., min_length=1, max_length=100, pattern=r'^[a-z][a-z0-9-]*$')
    description: str = Field(..., min_length=1, max_length=100000)
    system_prompt: Optional[str] = Field(None, max_length=100000)
    model: Optional[str] = Field("inherit", max_length=50)
    tools: list[str] = Field(default_factory=list)
    disallowed_tools: list[str] = Field(default_factory=list)
    permission_mode: Optional[str] = Field("default")
    max_turns: Optional[int] = Field(None)
    skills: list[str] = Field(default_factory=list)
    mcp_servers: list = Field(default_factory=list)
    hooks: Optional[dict] = Field(None)
    memory: Optional[str] = Field(None)
    background: bool = Field(False)
    isolation: Optional[str] = Field(None)
    scope: Literal["user", "project", "plugin"] = Field("user", description="创建位置：user, project 或 plugin")
    meta: Optional[dict] = Field(None, description="元数据，plugin scope 需包含 plugin_name，project scope 需包含 project_path")


class AgentUpdate(BaseModel):
    """更新子代理 Schema"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=100000)
    system_prompt: Optional[str] = Field(None, max_length=100000)
    model: Optional[str] = Field(None, max_length=50)
    tools: Optional[list[str]] = None
    disallowed_tools: Optional[list[str]] = None
    permission_mode: Optional[str] = None
    max_turns: Optional[int] = None
    skills: Optional[list[str]] = None
    mcp_servers: Optional[list] = None
    hooks: Optional[dict] = None
    memory: Optional[str] = None
    background: Optional[bool] = None
    isolation: Optional[str] = None
    meta: Optional[dict] = None


class AgentResponse(AgentBase):
    """子代理响应 Schema"""
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AgentListResponse(BaseModel):
    """子代理列表响应 Schema"""
    total: int
    items: list[AgentResponse]
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
    errors: list[str] = Field(default_factory=list, description="错误信息")


class AgentGenerateRequest(BaseModel):
    """
    使用 Claude 生成子代理请求

    参考 /agents 命令的 "Generate with Claude" 功能
    """
    prompt: str = Field(..., min_length=10, max_length=2000, description="描述子代理的用途和行为")
    scope: Literal["user", "project", "plugin"] = Field("user", description="创建位置：user, project 或 plugin")
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
    tools: list[str]
    suggested_filename: str
    preview_content: str = Field(..., description="完整的 Markdown 文件预览内容")


class AgentFileContent(BaseModel):
    """子代理文件内容（用于编辑）"""
    path: str = Field(..., description="文件路径")
    content: str = Field(..., description="完整的 Markdown 内容（YAML frontmatter + body）")
    frontmatter: dict = Field(default_factory=dict, description="解析后的 frontmatter")
    body: str = Field("", description="系统提示（Markdown body）")

"""
Agent Model - 统一的 AI Agent 数据模型

支持 Claude Code 和 OpenClaw 两种 AI 框架的 Agent 配置，
作为缓存层用于快速查询和前端展示
"""
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Boolean, Integer, JSON, DateTime, Text, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.project import Project


class AgentFramework(str, enum.Enum):
    """Agent 框架类型"""
    CLAUDE_CODE = "claude_code"
    OPENCLAW = "openclaw"
    HYBRID = "hybrid"  # 支持两种框架


class AgentType(str, enum.Enum):
    """Agent 类型"""
    SUBAGENT = "subagent"  # Claude Code 子代理
    SESSION = "session"    # OpenClaw 会话代理
    WORKFLOW = "workflow"  # 工作流代理
    TERMINAL = "terminal"  # 终端代理


class Agent(Base):
    """
    统一的 AI Agent 模型

    支持多种 AI 框架：
    - Claude Code Subagent: https://code.claude.com/docs/en/sub-agents
    - OpenClaw Agent: https://docs.openclaw.ai/concepts/agents
    """

    __tablename__ = "agents"

    # 主键
    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # 基础信息
    name: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    # Agent 框架和类型
    framework: Mapped[AgentFramework] = mapped_column(
        SQLEnum(AgentFramework, native_enum=False),
        default=AgentFramework.CLAUDE_CODE,
        nullable=False,
        index=True
    )
    agent_type: Mapped[AgentType] = mapped_column(
        SQLEnum(AgentType, native_enum=False),
        default=AgentType.SUBAGENT,
        nullable=False,
        index=True
    )

    # 系统提示（通用字段）
    system_prompt: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # 模型配置（通用字段）
    model: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default="inherit")

    # === Claude Code 专用字段 ===
    # 工具配置
    tools: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    disallowed_tools: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    permission_mode: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default="default")

    # 高级配置
    max_turns: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    memory: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    background: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    isolation: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # === OpenClaw 专用字段 ===
    # 持久化配置
    persist: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # true/project/custom

    # 上下文配置
    context: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # 重试和退避策略
    retry: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, default=3)
    backoff: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, default="exponential")  # none/linear/exponential

    # 权限配置（OpenClaw 风格）
    permissions: Mapped[list] = mapped_column(JSON, default=list, nullable=False)

    # === 通用字段 ===
    # 技能配置
    skills: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    mcp_servers: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    hooks: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # 作用域和优先级
    scope: Mapped[str] = mapped_column(String(50), nullable=False, default="user", index=True)
    priority: Mapped[int] = mapped_column(Integer, nullable=False, default=3)

    # 状态标记
    is_builtin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_overridden: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    override_info: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # 扩展元数据
    meta: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # 配置模板（用于快速创建相似 Agent）
    template_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)

    # 标签和分类
    tags: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    category: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)

    # 时间戳
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    # 向后兼容字段（已弃用）
    capability_ids: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    source: Mapped[str] = mapped_column(String(100), nullable=False, default="user")

    # 关联的 Projects（一个 Agent 可以关联多个 Project）
    projects: Mapped[List["Project"]] = relationship(
        "Project",
        back_populates="agent",
        foreign_keys="Project.agent_id"
    )

    def __repr__(self) -> str:
        return f"<Agent(id={self.id}, name='{self.name}', framework='{self.framework}', type='{self.agent_type}')>"

    @property
    def is_claude_code(self) -> bool:
        """是否为 Claude Code Agent"""
        return self.framework in [AgentFramework.CLAUDE_CODE, AgentFramework.HYBRID]

    @property
    def is_openclaw(self) -> bool:
        """是否为 OpenClaw Agent"""
        return self.framework in [AgentFramework.OPENCLAW, AgentFramework.HYBRID]

    def get_framework_config(self, framework: AgentFramework) -> dict:
        """获取特定框架的配置"""
        if framework == AgentFramework.CLAUDE_CODE:
            return {
                "tools": self.tools,
                "disallowed_tools": self.disallowed_tools,
                "permission_mode": self.permission_mode,
                "max_turns": self.max_turns,
                "memory": self.memory,
                "background": self.background,
                "isolation": self.isolation,
                "skills": self.skills,
                "mcp_servers": self.mcp_servers,
                "hooks": self.hooks
            }
        elif framework == AgentFramework.OPENCLAW:
            return {
                "model": self.model,
                "prompt": self.system_prompt,
                "persist": self.persist,
                "context": self.context,
                "retry": self.retry,
                "backoff": self.backoff,
                "skills": self.skills,
                "permissions": self.permissions
            }
        else:
            return {}

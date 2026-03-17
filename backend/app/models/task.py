"""
Task and Execution Models
"""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, Integer, JSON, DateTime, ForeignKey, Enum as SQLEnum, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.core.database import Base


class TaskStatus(str, enum.Enum):
    """Task status types"""
    DRAFT = "draft"              # 草稿状态
    PLANNING = "planning"        # 计划生成中
    PLAN_READY = "plan_ready"    # 计划已生成，等待确认
    PENDING = "pending"          # 等待执行
    RUNNING = "running"          # 执行中
    WAITING_USER = "waiting_user" # 等待用户输入
    SUCCEEDED = "succeeded"      # 执行成功
    FAILED = "failed"           # 执行失败
    CANCELLED = "cancelled"     # 已取消


class TaskType(str, enum.Enum):
    """任务类型"""
    SINGLE_AGENT = "single_agent"    # 单个 Agent 执行
    MULTI_AGENT = "multi_agent"      # 多个 Agent 协作
    WORKFLOW = "workflow"            # 工作流执行
    AGENT_TEAM = "agent_team"        # Agent 团队执行
    TERMINAL = "terminal"            # 终端命令执行
    CUSTOM = "custom"                # 自定义任务


class ExecutionStatus(str, enum.Enum):
    """Execution status types"""
    PENDING = "pending"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ExecutionType(str, enum.Enum):
    """执行类型"""
    WORKFLOW = "workflow"
    AGENT_TEST = "agent_test"
    AGENT_TEAM = "agent_team"
    TERMINAL = "terminal"
    PLAN_EXECUTION = "plan_execution"  # 计划执行


class Task(Base):
    """Task model representing user tasks with plan support"""

    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(String(2000), nullable=False)

    # 任务类型和配置
    task_type: Mapped[TaskType] = mapped_column(
        SQLEnum(TaskType, native_enum=False),
        default=TaskType.SINGLE_AGENT,
        nullable=False,
        index=True
    )

    # 关联信息
    project_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    workflow_id: Mapped[Optional[int]] = mapped_column(ForeignKey("workflows.id"), nullable=True)
    agent_team_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    agent_id: Mapped[Optional[int]] = mapped_column(ForeignKey("agents.id"), nullable=True, index=True)

    # 计划相关
    current_plan_id: Mapped[Optional[int]] = mapped_column(ForeignKey("plans.id"), nullable=True, index=True)
    auto_generate_plan: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    plan_template_id: Mapped[Optional[int]] = mapped_column(ForeignKey("plan_templates.id"), nullable=True)

    # 任务配置
    input_parameters: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # 任务输入参数
    execution_config: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # 执行配置

    # 优先级和调度
    priority: Mapped[int] = mapped_column(Integer, default=5, nullable=False, index=True)  # 1-10，数字越大优先级越高
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)      # 计划执行时间
    deadline: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)         # 截止时间

    # 状态信息
    status: Mapped[TaskStatus] = mapped_column(
        SQLEnum(TaskStatus, native_enum=False),
        default=TaskStatus.DRAFT,
        nullable=False,
        index=True
    )

    # 执行统计
    execution_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    success_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    failure_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # 结果信息
    result_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # 标签和分类
    tags: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    category: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)

    # 依赖关系（新增）
    depends_on: Mapped[list] = mapped_column(JSON, default=list, nullable=False)  # 前置任务 ID 列表
    blocks: Mapped[list] = mapped_column(JSON, default=list, nullable=False)      # 后续任务 ID 列表

    # 关联的 Plan 和 Progress（新增）
    related_plan_ids: Mapped[list] = mapped_column(JSON, default=list, nullable=False)     # 关联的 Plan ID 列表
    related_progress_ids: Mapped[list] = mapped_column(JSON, default=list, nullable=False) # 关联的 Progress ID 列表

    # 元数据
    meta: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

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
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    executions: Mapped[List["Execution"]] = relationship(
        "Execution",
        back_populates="task",
        cascade="all, delete-orphan"
    )
    plans: Mapped[List["Plan"]] = relationship(
        "Plan",
        foreign_keys="Plan.task_id",
        cascade="all, delete-orphan"
    )
    current_plan: Mapped[Optional["Plan"]] = relationship(
        "Plan",
        foreign_keys=[current_plan_id],
        post_update=True
    )

    def __repr__(self) -> str:
        return f"<Task(id={self.id}, title='{self.title}', type='{self.task_type}', status='{self.status}')>"

    @property
    def is_executable(self) -> bool:
        """是否可以执行"""
        return self.status in [TaskStatus.PENDING, TaskStatus.PLAN_READY, TaskStatus.FAILED]

    @property
    def needs_plan(self) -> bool:
        """是否需要生成计划"""
        return (
            self.auto_generate_plan and
            self.current_plan_id is None and
            self.task_type != TaskType.TERMINAL
        )

    @property
    def success_rate(self) -> float:
        """成功率"""
        if self.execution_count == 0:
            return 0.0
        return (self.success_count / self.execution_count) * 100

    def can_auto_generate_plan(self) -> bool:
        """是否可以自动生成计划"""
        return (
            self.auto_generate_plan and
            self.status in [TaskStatus.DRAFT, TaskStatus.PLANNING] and
            bool(self.description.strip())
        )


class Execution(Base):
    """Execution model representing workflow executions"""

    __tablename__ = "executions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    task_id: Mapped[Optional[int]] = mapped_column(ForeignKey("tasks.id"), nullable=True, index=True)
    workflow_id: Mapped[Optional[int]] = mapped_column(ForeignKey("workflows.id"), nullable=True)
    status: Mapped[ExecutionStatus] = mapped_column(
        SQLEnum(ExecutionStatus, native_enum=False),
        default=ExecutionStatus.PENDING,
        nullable=False,
        index=True
    )
    error_message: Mapped[Optional[str]] = mapped_column(String(2000), nullable=True)
    meta: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # 新增字段
    execution_type: Mapped[ExecutionType] = mapped_column(
        SQLEnum(ExecutionType, native_enum=False),
        default=ExecutionType.WORKFLOW,
        nullable=False,
        index=True
    )
    agent_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)
    test_input: Mapped[Optional[str]] = mapped_column(String(5000), nullable=True)
    test_output: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Agent Session 相关字段
    session_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    last_activity_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    is_background: Mapped[bool] = mapped_column(default=False, nullable=False)
    chat_history: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON 格式的聊天历史

    # Agent Runtime 相关字段
    process_pid: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)  # claude 进程 PID
    work_dir: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)  # 工作目录路径
    log_file: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)  # 日志文件路径

    # Terminal 相关字段
    terminal_pid: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)  # 进程 ID
    terminal_command: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # 执行的命令
    terminal_cwd: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)  # 工作目录
    terminal_output: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # 命令输出（限制大小）

    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
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
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    task: Mapped["Task"] = relationship("Task", back_populates="executions")
    node_executions: Mapped[List["NodeExecution"]] = relationship(
        "NodeExecution",
        back_populates="execution",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Execution(id={self.id}, task_id={self.task_id}, status='{self.status}')>"


class NodeExecution(Base):
    """NodeExecution model representing individual node executions"""

    __tablename__ = "node_executions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    execution_id: Mapped[int] = mapped_column(ForeignKey("executions.id"), nullable=False, index=True)
    node_id: Mapped[int] = mapped_column(ForeignKey("workflow_nodes.id"), nullable=False)
    status: Mapped[ExecutionStatus] = mapped_column(
        SQLEnum(ExecutionStatus, native_enum=False),
        default=ExecutionStatus.PENDING,
        nullable=False
    )
    output: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(String(2000), nullable=True)
    logs_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    output_summary: Mapped[Optional[str]] = mapped_column(String(2000), nullable=True)

    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
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

    # Relationships
    execution: Mapped["Execution"] = relationship("Execution", back_populates="node_executions")

    def __repr__(self) -> str:
        return f"<NodeExecution(id={self.id}, node_id={self.node_id}, status='{self.status}')>"

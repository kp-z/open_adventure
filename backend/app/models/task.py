"""
Task and Execution Models
"""
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, JSON, DateTime, ForeignKey, Enum as SQLEnum, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.core.database import Base


class TaskStatus(str, enum.Enum):
    """Task status types"""
    PENDING = "pending"
    RUNNING = "running"
    WAITING_USER = "waiting_user"
    SUCCEEDED = "succeeded"
    FAILED = "failed"


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


class Task(Base):
    """Task model representing user tasks"""

    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(String(2000), nullable=False)
    project_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    workflow_id: Mapped[Optional[int]] = mapped_column(ForeignKey("workflows.id"), nullable=True)
    agent_team_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    status: Mapped[TaskStatus] = mapped_column(
        SQLEnum(TaskStatus, native_enum=False),
        default=TaskStatus.PENDING,
        nullable=False,
        index=True
    )
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

    # Relationships
    executions: Mapped[list["Execution"]] = relationship(
        "Execution",
        back_populates="task",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Task(id={self.id}, title='{self.title}', status='{self.status}')>"


class Execution(Base):
    """Execution model representing workflow executions"""

    __tablename__ = "executions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id"), nullable=False, index=True)
    workflow_id: Mapped[int] = mapped_column(ForeignKey("workflows.id"), nullable=False)
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
    node_executions: Mapped[list["NodeExecution"]] = relationship(
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

"""
Plan Model - 执行计划数据模型

支持自动生成和管理 Agent 执行计划
"""
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Boolean, Integer, JSON, DateTime, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.core.database import Base


class PlanStatus(str, enum.Enum):
    """计划状态"""
    DRAFT = "draft"          # 草稿
    GENERATED = "generated"  # 已生成
    APPROVED = "approved"    # 已批准
    EXECUTING = "executing"  # 执行中
    COMPLETED = "completed"  # 已完成
    FAILED = "failed"        # 执行失败
    CANCELLED = "cancelled"  # 已取消


class PlanType(str, enum.Enum):
    """计划类型"""
    SEQUENTIAL = "sequential"    # 顺序执行
    PARALLEL = "parallel"       # 并行执行
    CONDITIONAL = "conditional" # 条件执行
    LOOP = "loop"              # 循环执行
    HYBRID = "hybrid"          # 混合模式


class StepStatus(str, enum.Enum):
    """步骤状态"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


class Plan(Base):
    """执行计划模型"""

    __tablename__ = "plans"

    # 主键
    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # 基础信息
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    # 关联信息
    task_id: Mapped[Optional[int]] = mapped_column(ForeignKey("tasks.id"), nullable=True, index=True)
    agent_id: Mapped[Optional[int]] = mapped_column(ForeignKey("agents.id"), nullable=True, index=True)

    # 计划配置
    plan_type: Mapped[PlanType] = mapped_column(
        SQLEnum(PlanType, native_enum=False),
        default=PlanType.SEQUENTIAL,
        nullable=False
    )
    status: Mapped[PlanStatus] = mapped_column(
        SQLEnum(PlanStatus, native_enum=False),
        default=PlanStatus.DRAFT,
        nullable=False,
        index=True
    )

    # 生成信息
    generated_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # 生成方式：auto/manual/template
    generation_prompt: Mapped[Optional[str]] = mapped_column(Text, nullable=True)    # 生成时的提示词
    generation_model: Mapped[Optional[str]] = mapped_column(String(50), nullable=True) # 生成使用的模型

    # 执行配置
    max_execution_time: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # 最大执行时间（秒）
    retry_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)      # 重试次数
    max_retries: Mapped[int] = mapped_column(Integer, default=3, nullable=False)     # 最大重试次数

    # 输入输出
    input_schema: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)   # 输入参数定义
    output_schema: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # 输出结果定义
    input_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)     # 实际输入数据
    output_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)    # 实际输出数据

    # 执行统计
    total_steps: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    completed_steps: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    failed_steps: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # 错误信息
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    error_step_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # 失败的步骤ID

    # 元数据
    meta: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    tags: Mapped[list] = mapped_column(JSON, default=list, nullable=False)

    # 时间戳
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # 关系
    steps: Mapped[List["PlanStep"]] = relationship("PlanStep", back_populates="plan", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Plan(id={self.id}, name='{self.name}', status='{self.status}')>"

    @property
    def progress_percentage(self) -> float:
        """计算执行进度百分比"""
        if self.total_steps == 0:
            return 0.0
        return (self.completed_steps / self.total_steps) * 100

    @property
    def is_executable(self) -> bool:
        """是否可以执行"""
        return self.status in [PlanStatus.APPROVED, PlanStatus.FAILED] and self.total_steps > 0

    @property
    def is_running(self) -> bool:
        """是否正在执行"""
        return self.status == PlanStatus.EXECUTING


class PlanStep(Base):
    """计划步骤模型"""

    __tablename__ = "plan_steps"

    # 主键
    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # 关联信息
    plan_id: Mapped[int] = mapped_column(ForeignKey("plans.id"), nullable=False, index=True)

    # 步骤信息
    step_number: Mapped[int] = mapped_column(Integer, nullable=False)  # 步骤序号
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    # 执行配置
    action_type: Mapped[str] = mapped_column(String(50), nullable=False)  # skill/agent/command/condition
    action_config: Mapped[dict] = mapped_column(JSON, nullable=False)     # 执行配置

    # 依赖关系
    depends_on: Mapped[list] = mapped_column(JSON, default=list, nullable=False)  # 依赖的步骤ID列表
    parallel_group: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # 并行组标识

    # 条件执行
    condition: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # 执行条件
    skip_on_failure: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # 状态信息
    status: Mapped[StepStatus] = mapped_column(
        SQLEnum(StepStatus, native_enum=False),
        default=StepStatus.PENDING,
        nullable=False
    )

    # 执行结果
    output: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    logs: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # 执行统计
    execution_time: Mapped[Optional[float]] = mapped_column(nullable=True)  # 执行时间（秒）
    retry_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # 时间戳
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # 关系
    plan: Mapped["Plan"] = relationship("Plan", back_populates="steps")

    def __repr__(self) -> str:
        return f"<PlanStep(id={self.id}, plan_id={self.plan_id}, step_number={self.step_number}, status='{self.status}')>"

    @property
    def is_ready_to_execute(self) -> bool:
        """是否准备好执行"""
        return self.status == StepStatus.PENDING and self._dependencies_satisfied()

    def _dependencies_satisfied(self) -> bool:
        """检查依赖是否满足"""
        if not self.depends_on:
            return True

        # 这里需要查询数据库检查依赖步骤的状态
        # 简化实现，实际应该在 service 层处理
        return True


class PlanTemplate(Base):
    """计划模板模型"""

    __tablename__ = "plan_templates"

    # 主键
    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # 基础信息
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)

    # 模板配置
    template_data: Mapped[dict] = mapped_column(JSON, nullable=False)  # 模板结构
    input_schema: Mapped[dict] = mapped_column(JSON, nullable=False)   # 输入参数定义

    # 适用范围
    applicable_agent_types: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    applicable_frameworks: Mapped[list] = mapped_column(JSON, default=list, nullable=False)

    # 使用统计
    usage_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    success_rate: Mapped[Optional[float]] = mapped_column(nullable=True)

    # 标签和元数据
    tags: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    meta: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # 状态
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_builtin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # 时间戳
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self) -> str:
        return f"<PlanTemplate(id={self.id}, name='{self.name}', category='{self.category}')>"
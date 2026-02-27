"""
Workflow Models
"""
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Boolean, Integer, JSON, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.core.database import Base


class WorkflowNodeType(str, enum.Enum):
    """Workflow node types"""
    TASK = "task"
    DECISION = "decision"
    PARALLEL_GATEWAY = "parallel_gateway"
    PARALLEL_JOIN = "parallel_join"
    LOOP_START = "loop_start"
    LOOP_END = "loop_end"


class Workflow(Base):
    """Workflow model representing execution workflows"""

    __tablename__ = "workflows"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    version: Mapped[str] = mapped_column(String(20), nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
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
    nodes: Mapped[list["WorkflowNode"]] = relationship(
        "WorkflowNode",
        back_populates="workflow",
        cascade="all, delete-orphan"
    )
    edges: Mapped[list["WorkflowEdge"]] = relationship(
        "WorkflowEdge",
        back_populates="workflow",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Workflow(id={self.id}, name='{self.name}', version='{self.version}')>"


class WorkflowNode(Base):
    """WorkflowNode model representing nodes in a workflow"""

    __tablename__ = "workflow_nodes"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    workflow_id: Mapped[int] = mapped_column(ForeignKey("workflows.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    type: Mapped[WorkflowNodeType] = mapped_column(
        SQLEnum(WorkflowNodeType, native_enum=False),
        nullable=False
    )
    agent_team_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    preferred_agent_ids: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    capability_filter_ids: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    config: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    position_x: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    position_y: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Advanced features
    condition_expression: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)  # For decision nodes
    loop_condition: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)  # For loop nodes
    max_iterations: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, default=10)  # Loop limit
    parallel_mode: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # "all" or "any"

    # Relationships
    workflow: Mapped["Workflow"] = relationship("Workflow", back_populates="nodes")

    def __repr__(self) -> str:
        return f"<WorkflowNode(id={self.id}, name='{self.name}', type='{self.type}')>"


class WorkflowEdge(Base):
    """WorkflowEdge model representing edges between workflow nodes"""

    __tablename__ = "workflow_edges"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    workflow_id: Mapped[int] = mapped_column(ForeignKey("workflows.id"), nullable=False, index=True)
    from_node_id: Mapped[int] = mapped_column(ForeignKey("workflow_nodes.id"), nullable=False)
    to_node_id: Mapped[int] = mapped_column(ForeignKey("workflow_nodes.id"), nullable=False)
    condition: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Relationships
    workflow: Mapped["Workflow"] = relationship("Workflow", back_populates="edges")

    def __repr__(self) -> str:
        return f"<WorkflowEdge(id={self.id}, from={self.from_node_id}, to={self.to_node_id})>"


class WorkflowTemplate(Base):
    """WorkflowTemplate model for reusable workflow templates"""

    __tablename__ = "workflow_templates"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    workflow_data: Mapped[dict] = mapped_column(JSON, nullable=False)  # Complete workflow structure
    is_public: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

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

    def __repr__(self) -> str:
        return f"<WorkflowTemplate(id={self.id}, name='{self.name}', category='{self.category}')>"

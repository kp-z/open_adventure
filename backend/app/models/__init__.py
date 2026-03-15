"""
Models package - 导出所有 ORM 模型

确保所有模型在数据库初始化时被注册到 Base.metadata
"""
from app.models.skill import Skill, SkillSource
from app.models.agent import Agent, AgentFramework, AgentType
from app.models.agent_team import AgentTeam
from app.models.workflow import Workflow, WorkflowNode, WorkflowEdge, WorkflowTemplate
from app.models.task import Task, TaskStatus, TaskType, Execution, ExecutionStatus, ExecutionType, NodeExecution
from app.models.plan import Plan, PlanStep, PlanTemplate, PlanStatus, PlanType, StepStatus
from app.models.user import User
from app.models.team_message import TeamMessage
from app.models.team_task import TeamTask
from app.models.team_state import TeamState
from app.models.project_path import ProjectPath
from app.models.plugin import Plugin, PluginStatus

__all__ = [
    "Skill",
    "SkillSource",
    "Agent",
    "AgentFramework",
    "AgentType",
    "AgentTeam",
    "Workflow",
    "WorkflowNode",
    "WorkflowEdge",
    "WorkflowTemplate",
    "Task",
    "TaskStatus",
    "TaskType",
    "Execution",
    "ExecutionStatus",
    "ExecutionType",
    "NodeExecution",
    "Plan",
    "PlanStep",
    "PlanTemplate",
    "PlanStatus",
    "PlanType",
    "StepStatus",
    "User",
    "TeamMessage",
    "TeamTask",
    "TeamState",
    "ProjectPath",
    "Plugin",
    "PluginStatus"
]

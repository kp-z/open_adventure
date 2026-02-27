"""
Base Adapter Interfaces

定义 Adapter 层的抽象接口，为未来扩展其他 AI 框架预留空间
"""
from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any
from pathlib import Path


class SkillProvider(ABC):
    """技能提供者接口"""

    @abstractmethod
    async def scan_skills(self) -> List[Dict[str, Any]]:
        """
        扫描并返回所有技能

        Returns:
            List[Dict]: 技能列表，每个技能包含:
                - name: 技能名称
                - full_name: 完整名称（包含命名空间）
                - type: 技能类型
                - description: 描述
                - tags: 标签列表
                - source: 来源（global/plugin/project）
                - meta: 其他元数据
        """
        pass

    @abstractmethod
    async def get_skill_detail(self, skill_name: str) -> Optional[Dict[str, Any]]:
        """
        获取技能详细信息

        Args:
            skill_name: 技能名称

        Returns:
            Dict: 技能详细信息，如果不存在返回 None
        """
        pass


class AgentProvider(ABC):
    """智能体提供者接口"""

    @abstractmethod
    async def scan_agents(self) -> List[Dict[str, Any]]:
        """
        扫描并返回所有智能体

        Returns:
            List[Dict]: 智能体列表，每个智能体包含:
                - name: 名称
                - description: 描述
                - system_prompt: 系统提示词
                - model: 使用的模型
                - capability_ids: 关联的技能 ID 列表
                - source: 来源
                - meta: 其他元数据
        """
        pass

    @abstractmethod
    async def get_agent_detail(self, agent_name: str) -> Optional[Dict[str, Any]]:
        """
        获取智能体详细信息

        Args:
            agent_name: 智能体名称

        Returns:
            Dict: 智能体详细信息，如果不存在返回 None
        """
        pass


class AgentTeamProvider(ABC):
    """智能体队伍提供者接口"""

    @abstractmethod
    async def scan_agent_teams(self) -> List[Dict[str, Any]]:
        """
        扫描并返回所有智能体队伍

        Returns:
            List[Dict]: 队伍列表，每个队伍包含:
                - name: 队伍名称
                - description: 描述
                - members: 成员列表
                - tags: 标签
                - meta: 其他元数据
        """
        pass

    @abstractmethod
    async def get_agent_team_detail(self, team_name: str) -> Optional[Dict[str, Any]]:
        """
        获取队伍详细信息

        Args:
            team_name: 队伍名称

        Returns:
            Dict: 队伍详细信息，如果不存在返回 None
        """
        pass


class WorkflowExecutionProvider(ABC):
    """工作流执行提供者接口"""

    @abstractmethod
    async def execute_skill(
        self,
        skill_name: str,
        input_data: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        执行单个技能

        Args:
            skill_name: 技能名称
            input_data: 输入数据
            context: 执行上下文

        Returns:
            Dict: 执行结果，包含:
                - success: 是否成功
                - output: 输出内容
                - logs: 日志
                - error: 错误信息（如果失败）
        """
        pass

    @abstractmethod
    async def execute_with_agent(
        self,
        agent_name: str,
        task_description: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        使用智能体执行任务

        Args:
            agent_name: 智能体名称
            task_description: 任务描述
            context: 执行上下文

        Returns:
            Dict: 执行结果
        """
        pass

    @abstractmethod
    async def execute_with_team(
        self,
        team_name: str,
        task_description: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        使用智能体队伍执行任务

        Args:
            team_name: 队伍名称
            task_description: 任务描述
            context: 执行上下文

        Returns:
            Dict: 执行结果
        """
        pass


class HealthChecker(ABC):
    """健康检查接口"""

    @abstractmethod
    async def check_health(self) -> Dict[str, Any]:
        """
        检查 AI 环境健康状态

        Returns:
            Dict: 健康状态，包含:
                - available: 是否可用
                - version: 版本信息
                - config_path: 配置路径
                - issues: 问题列表（如果有）
        """
        pass


class AdapterProvider(
    SkillProvider,
    AgentProvider,
    AgentTeamProvider,
    WorkflowExecutionProvider,
    HealthChecker,
    ABC
):
    """
    完整的 Adapter 提供者接口

    组合所有子接口，提供完整的 AI 环境适配能力
    """
    pass

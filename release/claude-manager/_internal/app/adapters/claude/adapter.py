"""
Claude Adapter

组合 ClaudeFileScanner, ClaudeCliClient, ClaudeHealthChecker
实现完整的 Claude Code 适配器
"""
from typing import Dict, Any, Optional, List

from app.adapters.base import AdapterProvider
from app.adapters.claude.file_scanner import ClaudeFileScanner
from app.adapters.claude.cli_client import ClaudeCliClient
from app.adapters.claude.health_checker import ClaudeHealthChecker
from app.core.logging import get_logger

logger = get_logger(__name__)


class ClaudeAdapter(AdapterProvider):
    """Claude Code 适配器实现"""

    def __init__(self):
        self.file_scanner = ClaudeFileScanner()
        self.cli_client = ClaudeCliClient()
        self.health_checker = ClaudeHealthChecker()

    # SkillProvider 实现
    async def scan_skills(self) -> List[Dict[str, Any]]:
        """扫描所有技能"""
        return await self.file_scanner.scan_skills()

    async def get_skill_detail(self, skill_name: str) -> Optional[Dict[str, Any]]:
        """获取技能详细信息"""
        # 扫描所有技能并查找匹配的
        skills = await self.scan_skills()
        for skill in skills:
            if skill["name"] == skill_name or skill["full_name"] == skill_name:
                return skill
        return None

    # AgentProvider 实现
    async def scan_agents(self) -> List[Dict[str, Any]]:
        """扫描所有智能体"""
        return await self.file_scanner.scan_agents()

    async def get_agent_detail(self, agent_name: str) -> Optional[Dict[str, Any]]:
        """获取智能体详细信息"""
        agents = await self.scan_agents()
        for agent in agents:
            if agent["name"] == agent_name:
                return agent
        return None

    # AgentTeamProvider 实现
    async def scan_agent_teams(self) -> List[Dict[str, Any]]:
        """扫描所有智能体队伍"""
        return await self.file_scanner.scan_agent_teams()

    async def get_agent_team_detail(self, team_name: str) -> Optional[Dict[str, Any]]:
        """获取队伍详细信息"""
        teams = await self.scan_agent_teams()
        for team in teams:
            if team["name"] == team_name:
                return team
        return None

    # WorkflowExecutionProvider 实现
    async def execute_skill(
        self,
        skill_name: str,
        args: str = "",
        timeout: int = 300
    ) -> Dict[str, Any]:
        """执行单个技能"""
        input_data = {"args": args}
        context = {"timeout": timeout}
        return await self.cli_client.execute_skill(skill_name, input_data, context)

    async def execute_with_agent(
        self,
        agent_name: str,
        prompt: str,
        timeout: int = 600
    ) -> Dict[str, Any]:
        """使用智能体执行任务"""
        context = {"timeout": timeout}
        return await self.cli_client.execute_with_agent(agent_name, prompt, context)

    async def execute_with_team(
        self,
        team_name: str,
        prompt: str,
        timeout: int = 900
    ) -> Dict[str, Any]:
        """使用智能体队伍执行任务"""
        context = {"timeout": timeout}
        return await self.cli_client.execute_with_team(team_name, prompt, context)

    # HealthChecker 实现
    async def check_health(self) -> Dict[str, Any]:
        """检查 Claude 环境健康状态"""
        return await self.health_checker.check_health()

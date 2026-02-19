"""
Claude File Scanner

扫描本地 Claude Code 文件系统，提取 skills/agents/agent teams 信息
"""
import json
from pathlib import Path
from typing import List, Dict, Any, Optional

from app.config.settings import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class ClaudeFileScanner:
    """Claude 文件系统扫描器"""

    def __init__(self):
        self.config_dir = settings.claude_config_dir
        self.skills_dir = settings.claude_skills_dir
        self.plugins_dir = settings.claude_plugins_dir

    async def scan_skills(self) -> List[Dict[str, Any]]:
        """
        扫描所有技能

        扫描路径：
        1. ~/.claude/skills/ (全局技能)
        2. 项目目录 .claude/skills/ (项目技能)
        3. plugins/*/skills/ (插件技能)

        Returns:
            List[Dict]: 技能列表
        """
        skills = []

        # 扫描全局技能
        if self.skills_dir.exists():
            global_skills = await self._scan_skills_in_dir(
                self.skills_dir,
                source="global"
            )
            skills.extend(global_skills)
            logger.info(f"Found {len(global_skills)} global skills")

        # 扫描插件技能
        if self.plugins_dir.exists():
            plugin_skills = await self._scan_plugin_skills()
            skills.extend(plugin_skills)
            logger.info(f"Found {len(plugin_skills)} plugin skills")

        # TODO: 扫描项目技能（需要知道当前项目路径）

        return skills

    async def _scan_skills_in_dir(
        self,
        directory: Path,
        source: str
    ) -> List[Dict[str, Any]]:
        """
        扫描指定目录中的技能

        Args:
            directory: 目录路径
            source: 来源标识（global/plugin/project）

        Returns:
            List[Dict]: 技能列表
        """
        skills = []

        try:
            for skill_dir in directory.iterdir():
                if not skill_dir.is_dir():
                    continue

                skill_data = await self._parse_skill(skill_dir, source)
                if skill_data:
                    skills.append(skill_data)

        except Exception as e:
            logger.error(f"Error scanning skills in {directory}: {e}")

        return skills

    async def _parse_skill(
        self,
        skill_dir: Path,
        source: str
    ) -> Optional[Dict[str, Any]]:
        """
        解析单个技能目录

        Args:
            skill_dir: 技能目录路径
            source: 来源标识

        Returns:
            Dict: 技能数据，如果解析失败返回 None
        """
        try:
            skill_name = skill_dir.name

            # 查找技能定义文件（可能是 skill.md 或 skill.yaml）
            skill_md = skill_dir / "skill.md"
            skill_yaml = skill_dir / "skill.yaml"
            skill_json = skill_dir / "skill.json"

            description = ""
            skill_type = "command"
            tags = []
            meta = {}

            # 优先读取 YAML/JSON 配置
            if skill_yaml.exists():
                import yaml
                with open(skill_yaml, "r", encoding="utf-8") as f:
                    config = yaml.safe_load(f)
                    description = config.get("description", "")
                    skill_type = config.get("type", "command")
                    tags = config.get("tags", [])
                    meta = config.get("meta", {})

            elif skill_json.exists():
                with open(skill_json, "r", encoding="utf-8") as f:
                    config = json.load(f)
                    description = config.get("description", "")
                    skill_type = config.get("type", "command")
                    tags = config.get("tags", [])
                    meta = config.get("meta", {})

            elif skill_md.exists():
                # 从 Markdown 文件提取描述（第一段）
                with open(skill_md, "r", encoding="utf-8") as f:
                    content = f.read()
                    lines = content.split("\n")
                    # 跳过标题，找到第一段描述
                    for line in lines:
                        line = line.strip()
                        if line and not line.startswith("#"):
                            description = line
                            break

            # 如果没有描述，使用目录名
            if not description:
                description = skill_name.replace("_", " ").replace("-", " ").title()

            return {
                "name": skill_name,
                "full_name": f"{source}/{skill_name}",
                "type": skill_type,
                "description": description,
                "tags": tags,
                "source": source,
                "enabled": True,
                "meta": {
                    **meta,
                    "path": str(skill_dir)
                }
            }

        except Exception as e:
            logger.error(f"Error parsing skill {skill_dir}: {e}")
            return None

    async def _scan_plugin_skills(self) -> List[Dict[str, Any]]:
        """
        扫描所有插件中的技能

        Returns:
            List[Dict]: 插件技能列表
        """
        skills = []

        try:
            if not self.plugins_dir.exists():
                return skills

            for plugin_dir in self.plugins_dir.iterdir():
                if not plugin_dir.is_dir():
                    continue

                plugin_skills_dir = plugin_dir / "skills"
                if plugin_skills_dir.exists():
                    plugin_name = plugin_dir.name
                    plugin_skills = await self._scan_skills_in_dir(
                        plugin_skills_dir,
                        source="plugin"
                    )
                    # 在 meta 中记录插件名称
                    for skill in plugin_skills:
                        skill["meta"]["plugin_name"] = plugin_name
                    skills.extend(plugin_skills)

        except Exception as e:
            logger.error(f"Error scanning plugin skills: {e}")

        return skills

    async def scan_agents(self) -> List[Dict[str, Any]]:
        """
        扫描所有智能体

        Returns:
            List[Dict]: 智能体列表
        """
        agents = []

        # 扫描 ~/.claude/agents/
        agents_dir = self.config_dir / "agents"
        if agents_dir.exists():
            try:
                for agent_file in agents_dir.glob("*.json"):
                    agent_data = await self._parse_agent(agent_file)
                    if agent_data:
                        agents.append(agent_data)
            except Exception as e:
                logger.error(f"Error scanning agents: {e}")

        logger.info(f"Found {len(agents)} agents")
        return agents

    async def _parse_agent(self, agent_file: Path) -> Optional[Dict[str, Any]]:
        """
        解析智能体配置文件

        Args:
            agent_file: 智能体配置文件路径

        Returns:
            Dict: 智能体数据
        """
        try:
            with open(agent_file, "r", encoding="utf-8") as f:
                config = json.load(f)

            return {
                "name": config.get("name", agent_file.stem),
                "description": config.get("description", ""),
                "system_prompt": config.get("system_prompt", ""),
                "model": config.get("model", "claude-3-5-sonnet-20241022"),
                "capability_ids": config.get("skills", []),
                "source": "global",
                "meta": {
                    "path": str(agent_file),
                    **config.get("meta", {})
                }
            }

        except Exception as e:
            logger.error(f"Error parsing agent {agent_file}: {e}")
            return None

    async def scan_agent_teams(self) -> List[Dict[str, Any]]:
        """
        扫描所有智能体队伍

        Returns:
            List[Dict]: 队伍列表
        """
        teams = []

        # 扫描 ~/.claude/teams/
        teams_dir = self.config_dir / "teams"
        if teams_dir.exists():
            try:
                for team_file in teams_dir.glob("*.json"):
                    team_data = await self._parse_agent_team(team_file)
                    if team_data:
                        teams.append(team_data)
            except Exception as e:
                logger.error(f"Error scanning agent teams: {e}")

        logger.info(f"Found {len(teams)} agent teams")
        return teams

    async def _parse_agent_team(self, team_file: Path) -> Optional[Dict[str, Any]]:
        """
        解析队伍配置文件

        Args:
            team_file: 队伍配置文件路径

        Returns:
            Dict: 队伍数据
        """
        try:
            with open(team_file, "r", encoding="utf-8") as f:
                config = json.load(f)

            return {
                "name": config.get("name", team_file.stem),
                "description": config.get("description", ""),
                "members": config.get("members", []),
                "tags": config.get("tags", []),
                "meta": {
                    "path": str(team_file),
                    **config.get("meta", {})
                }
            }

        except Exception as e:
            logger.error(f"Error parsing agent team {team_file}: {e}")
            return None

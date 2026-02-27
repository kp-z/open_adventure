"""
Sync Service

负责将 Claude Adapter 扫描到的数据同步到数据库
"""
from typing import Dict, Any, List
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.claude import ClaudeAdapter
from app.repositories.skill_repository import SkillRepository
from app.repositories.agent_repository import AgentRepository
from app.repositories.agent_team_repository import AgentTeamRepository
from app.repositories.project_path_repository import ProjectPathRepository
from app.schemas.skill import SkillCreate
from app.schemas.agent import AgentCreate
from app.schemas.agent_team import AgentTeamCreate
from app.core.logging import get_logger

logger = get_logger(__name__)


class SyncService:
    """同步服务"""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.adapter = ClaudeAdapter()
        self.skill_repo = SkillRepository(session)
        self.agent_repo = AgentRepository(session)
        self.agent_team_repo = AgentTeamRepository(session)
        self.project_path_repo = ProjectPathRepository(session)

    async def sync_all(self) -> Dict[str, Any]:
        """
        同步所有数据

        Returns:
            Dict: 同步结果统计
        """
        logger.info("Starting full sync...")

        # 检查健康状态（仅作为警告，不阻止同步）
        health = await self.adapter.check_health()
        warnings = []
        if not health["available"]:
            logger.warning("Claude CLI not available, will sync file system data only")
            warnings.append("Claude CLI not available - syncing file system data only")

        # 同步技能
        skills_result = await self.sync_skills()

        # 同步智能体
        agents_result = await self.sync_agents()

        # 同步队伍
        teams_result = await self.sync_agent_teams()

        logger.info("Full sync completed")

        return {
            "success": True,
            "warnings": warnings,
            "health": health,
            "skills": skills_result,
            "agents": agents_result,
            "agent_teams": teams_result
        }

    async def sync_skills(self) -> Dict[str, Any]:
        """
        同步技能
        
        同步逻辑：
        1. 扫描文件系统中的 skills
        2. 创建或更新数据库中的记录
        3. 删除数据库中不再存在于文件系统的 skills

        Returns:
            Dict: 同步结果
        """
        logger.info("Syncing skills...")

        try:
            # 步骤 1: 获取启用的项目路径
            enabled_paths = await self.project_path_repo.get_enabled_paths()
            project_paths = [
                {
                    "path": p.path,
                    "alias": p.alias or Path(p.path).name,
                    "recursive_scan": p.recursive_scan
                }
                for p in enabled_paths
            ]

            # 步骤 2: 扫描技能
            scanned_skills = await self.adapter.scan_skills(project_paths=project_paths)
            logger.info(f"Scanned {len(scanned_skills)} skills")
            
            # 记录扫描到的 skill 名称
            scanned_names = {skill["name"] for skill in scanned_skills}

            created = 0
            updated = 0
            deleted = 0
            errors = []

            # 步骤 2: 创建或更新 skills
            # 使用路径作为唯一标识，支持同名 skill 在不同位置
            for skill_data in scanned_skills:
                try:
                    # 获取 skill 的路径作为唯一标识
                    skill_path = skill_data.get("meta", {}).get("path", "")
                    
                    # 按路径查找是否已存在
                    existing = None
                    if skill_path:
                        existing = await self.skill_repo.get_by_path(skill_path)

                    if existing:
                        # 更新现有技能
                        from app.schemas.skill import SkillUpdate
                        skill_update = SkillUpdate(
                            description=skill_data["description"],
                            type=skill_data["type"],
                            tags=skill_data["tags"],
                            source=skill_data["source"],
                            meta=skill_data["meta"]
                        )
                        await self.skill_repo.update(existing.id, skill_update)
                        updated += 1
                    else:
                        # 创建新技能
                        skill_create = SkillCreate(**skill_data)
                        await self.skill_repo.create(skill_create)
                        created += 1

                except Exception as e:
                    error_msg = f"Error syncing skill {skill_data['name']}: {str(e)}"
                    logger.error(error_msg)
                    errors.append(error_msg)

            # 步骤 3: 删除数据库中不再存在于文件系统的 skills
            # 使用路径来识别哪些 skill 需要删除
            scanned_paths = {skill.get("meta", {}).get("path", "") for skill in scanned_skills}
            scanned_paths.discard("")  # 移除空路径
            
            try:
                all_db_skills, _ = await self.skill_repo.get_all(skip=0, limit=1000)
                for db_skill in all_db_skills:
                    db_path = db_skill.meta.get("path", "") if db_skill.meta else ""
                    if db_path and db_path not in scanned_paths:
                        logger.info(f"Deleting skill not found in filesystem: {db_skill.name} at {db_path}")
                        await self.skill_repo.delete(db_skill.id)
                        deleted += 1
            except Exception as e:
                error_msg = f"Error cleaning up orphaned skills: {str(e)}"
                logger.error(error_msg)
                errors.append(error_msg)

            return {
                "total_scanned": len(scanned_skills),
                "created": created,
                "updated": updated,
                "deleted": deleted,
                "errors": errors
            }

        except Exception as e:
            logger.error(f"Error syncing skills: {e}")
            return {
                "total_scanned": 0,
                "created": 0,
                "updated": 0,
                "deleted": 0,
                "errors": [str(e)]
            }

    async def sync_agents(self) -> Dict[str, Any]:
        """
        同步智能体

        同步逻辑：
        1. 扫描文件系统中的 agents
        2. 使用路径作为唯一标识创建或更新数据库记录
        3. 删除数据库中不再存在于文件系统的 agents

        Returns:
            Dict: 同步结果
        """
        logger.info("Syncing agents...")

        try:
            # 步骤 1: 获取启用的项目路径
            enabled_paths = await self.project_path_repo.get_enabled_paths()
            project_paths = [
                {
                    "path": p.path,
                    "alias": p.alias or Path(p.path).name,
                    "recursive_scan": p.recursive_scan
                }
                for p in enabled_paths
            ]

            # 步骤 2: 扫描智能体
            scanned_agents = await self.adapter.scan_agents(project_paths=project_paths)
            logger.info(f"Scanned {len(scanned_agents)} agents")

            # 记录扫描到的 agent 路径
            scanned_paths = set()

            created = 0
            updated = 0
            deleted = 0
            errors = []

            # 步骤 2: 创建或更新 agents
            # 使用路径作为唯一标识，支持同名 agent 在不同位置
            for agent_data in scanned_agents:
                try:
                    # 获取 agent 的路径作为唯一标识
                    agent_path = agent_data.get("meta", {}).get("path", "")

                    if agent_path:
                        scanned_paths.add(agent_path)

                    # 按路径查找是否已存在
                    existing = None
                    if agent_path:
                        existing = await self.agent_repo.get_by_path(agent_path)

                    # 如果没有路径，使用 name+scope 组合查找（向后兼容）
                    if not existing and not agent_path:
                        existing = await self.agent_repo.get_by_name_and_scope(
                            agent_data["name"],
                            agent_data["scope"]
                        )

                    if existing:
                        # 更新现有智能体
                        from app.schemas.agent import AgentUpdate
                        agent_update = AgentUpdate(
                            description=agent_data["description"],
                            system_prompt=agent_data["system_prompt"],
                            model=agent_data["model"],
                            tools=agent_data.get("tools", []),
                            disallowed_tools=agent_data.get("disallowed_tools", []),
                            permission_mode=agent_data.get("permission_mode"),
                            max_turns=agent_data.get("max_turns"),
                            skills=agent_data.get("skills", []),
                            mcp_servers=agent_data.get("mcp_servers", []),
                            hooks=agent_data.get("hooks"),
                            memory=agent_data.get("memory"),
                            background=agent_data.get("background", False),
                            isolation=agent_data.get("isolation"),
                            priority=agent_data.get("priority", 3),
                            is_active=agent_data.get("is_active", True),
                            is_overridden=agent_data.get("is_overridden", False),
                            override_info=agent_data.get("override_info"),
                            meta=agent_data["meta"]
                        )
                        await self.agent_repo.update(existing.id, agent_update)
                        updated += 1
                    else:
                        # 创建新智能体
                        agent_create = AgentCreate(**agent_data)
                        await self.agent_repo.create(agent_create)
                        created += 1

                except Exception as e:
                    error_msg = f"Error syncing agent {agent_data['name']}: {str(e)}"
                    logger.error(error_msg)
                    errors.append(error_msg)

            # 步骤 3: 删除数据库中不再存在于文件系统的 agents
            # 只删除有路径的 agents（builtin agents 通常没有路径）
            try:
                all_db_agents, _ = await self.agent_repo.get_all(skip=0, limit=1000)
                for db_agent in all_db_agents:
                    db_path = db_agent.meta.get("path", "") if db_agent.meta else ""
                    # 只删除有路径且路径不在扫描结果中的 agents
                    if db_path and db_path not in scanned_paths:
                        logger.info(f"Deleting agent not found in filesystem: {db_agent.name} at {db_path}")
                        await self.agent_repo.delete(db_agent.id)
                        deleted += 1
            except Exception as e:
                error_msg = f"Error cleaning up orphaned agents: {str(e)}"
                logger.error(error_msg)
                errors.append(error_msg)

            return {
                "total_scanned": len(scanned_agents),
                "created": created,
                "updated": updated,
                "deleted": deleted,
                "errors": errors
            }

        except Exception as e:
            logger.error(f"Error syncing agents: {e}")
            return {
                "total_scanned": 0,
                "created": 0,
                "updated": 0,
                "deleted": 0,
                "errors": [str(e)]
            }

    async def sync_agent_teams(self) -> Dict[str, Any]:
        """
        同步智能体队伍

        Returns:
            Dict: 同步结果
        """
        logger.info("Syncing agent teams...")

        try:
            # 扫描队伍
            scanned_teams = await self.adapter.scan_agent_teams()
            logger.info(f"Scanned {len(scanned_teams)} agent teams")

            created = 0
            updated = 0
            errors = []

            for team_data in scanned_teams:
                try:
                    # 检查是否已存在
                    existing = await self.agent_team_repo.get_by_name(team_data["name"])

                    if existing:
                        # 更新现有队伍
                        from app.schemas.agent_team import AgentTeamUpdate
                        team_update = AgentTeamUpdate(
                            description=team_data["description"],
                            members=team_data["members"],
                            tags=team_data["tags"],
                            meta=team_data["meta"]
                        )
                        await self.agent_team_repo.update(existing.id, team_update)
                        updated += 1
                    else:
                        # 创建新队伍
                        team_create = AgentTeamCreate(**team_data)
                        await self.agent_team_repo.create(team_create)
                        created += 1

                except Exception as e:
                    error_msg = f"Error syncing agent team {team_data['name']}: {str(e)}"
                    logger.error(error_msg)
                    errors.append(error_msg)

            return {
                "total_scanned": len(scanned_teams),
                "created": created,
                "updated": updated,
                "errors": errors
            }

        except Exception as e:
            logger.error(f"Error syncing agent teams: {e}")
            return {
                "total_scanned": 0,
                "created": 0,
                "updated": 0,
                "errors": [str(e)]
            }

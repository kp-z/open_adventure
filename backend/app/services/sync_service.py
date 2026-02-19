"""
Sync Service

负责将 Claude Adapter 扫描到的数据同步到数据库
"""
from typing import Dict, Any, List

from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.claude import ClaudeAdapter
from app.repositories.skill_repository import SkillRepository
from app.repositories.agent_repository import AgentRepository
from app.repositories.agent_team_repository import AgentTeamRepository
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

        Returns:
            Dict: 同步结果
        """
        logger.info("Syncing skills...")

        try:
            # 扫描技能
            scanned_skills = await self.adapter.scan_skills()
            logger.info(f"Scanned {len(scanned_skills)} skills")

            created = 0
            updated = 0
            errors = []

            for skill_data in scanned_skills:
                try:
                    # 检查是否已存在
                    existing = await self.skill_repo.get_by_name(skill_data["name"])

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

            return {
                "total_scanned": len(scanned_skills),
                "created": created,
                "updated": updated,
                "errors": errors
            }

        except Exception as e:
            logger.error(f"Error syncing skills: {e}")
            return {
                "total_scanned": 0,
                "created": 0,
                "updated": 0,
                "errors": [str(e)]
            }

    async def sync_agents(self) -> Dict[str, Any]:
        """
        同步智能体

        Returns:
            Dict: 同步结果
        """
        logger.info("Syncing agents...")

        try:
            # 扫描智能体
            scanned_agents = await self.adapter.scan_agents()
            logger.info(f"Scanned {len(scanned_agents)} agents")

            created = 0
            updated = 0
            errors = []

            for agent_data in scanned_agents:
                try:
                    # 检查是否已存在
                    existing = await self.agent_repo.get_by_name(agent_data["name"])

                    if existing:
                        # 更新现有智能体
                        from app.schemas.agent import AgentUpdate
                        agent_update = AgentUpdate(
                            description=agent_data["description"],
                            system_prompt=agent_data["system_prompt"],
                            model=agent_data["model"],
                            capability_ids=agent_data["capability_ids"],
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

            return {
                "total_scanned": len(scanned_agents),
                "created": created,
                "updated": updated,
                "errors": errors
            }

        except Exception as e:
            logger.error(f"Error syncing agents: {e}")
            return {
                "total_scanned": 0,
                "created": 0,
                "updated": 0,
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

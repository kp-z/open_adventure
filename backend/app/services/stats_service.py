"""
Statistics Service
"""
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.skill import Skill
from app.models.agent import Agent
from app.models.agent_team import AgentTeam
from app.models.workflow import Workflow
from app.models.task import Task, Execution, ExecutionStatus


class StatsService:
    """Service for statistics operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_overview(self) -> dict:
        """Get overview statistics"""
        # Count all entities
        skills_count = await self._count_table(Skill)
        agents_count = await self._count_table(Agent)
        teams_count = await self._count_table(AgentTeam)
        workflows_count = await self._count_table(Workflow)
        tasks_count = await self._count_table(Task)
        executions_count = await self._count_table(Execution)

        # Count executions by status
        completed_count = await self._count_executions_by_status(ExecutionStatus.SUCCEEDED)
        failed_count = await self._count_executions_by_status(ExecutionStatus.FAILED)
        running_count = await self._count_executions_by_status(ExecutionStatus.RUNNING)

        return {
            "skills_count": skills_count,
            "agents_count": agents_count,
            "teams_count": teams_count,
            "workflows_count": workflows_count,
            "tasks_count": tasks_count,
            "executions_count": executions_count,
            "executions_completed": completed_count,
            "executions_failed": failed_count,
            "executions_running": running_count,
        }

    async def get_recent_executions(self, limit: int = 10) -> list[Execution]:
        """Get recent executions"""
        result = await self.db.execute(
            select(Execution)
            .order_by(Execution.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_success_rate(self, days: int = 7) -> dict:
        """Get success rate for the last N days"""
        start_date = datetime.utcnow() - timedelta(days=days)

        # Get executions in the date range
        result = await self.db.execute(
            select(Execution)
            .where(Execution.created_at >= start_date)
        )
        executions = list(result.scalars().all())

        if not executions:
            return {
                "total": 0,
                "completed": 0,
                "failed": 0,
                "success_rate": 0.0,
                "days": days
            }

        total = len(executions)
        completed = sum(1 for e in executions if e.status == ExecutionStatus.SUCCEEDED)
        failed = sum(1 for e in executions if e.status == ExecutionStatus.FAILED)
        success_rate = (completed / total * 100) if total > 0 else 0.0

        return {
            "total": total,
            "completed": completed,
            "failed": failed,
            "success_rate": round(success_rate, 2),
            "days": days
        }

    async def get_daily_execution_stats(self, days: int = 7) -> list[dict]:
        """Get daily execution statistics for the last N days"""
        start_date = datetime.utcnow() - timedelta(days=days)

        # Get all executions in the date range
        result = await self.db.execute(
            select(Execution)
            .where(Execution.created_at >= start_date)
            .order_by(Execution.created_at)
        )
        executions = list(result.scalars().all())

        # Group by date
        daily_stats = {}
        for execution in executions:
            date_key = execution.created_at.date().isoformat()
            if date_key not in daily_stats:
                daily_stats[date_key] = {
                    "date": date_key,
                    "total": 0,
                    "completed": 0,
                    "failed": 0,
                    "running": 0,
                }

            daily_stats[date_key]["total"] += 1
            if execution.status == ExecutionStatus.SUCCEEDED:
                daily_stats[date_key]["completed"] += 1
            elif execution.status == ExecutionStatus.FAILED:
                daily_stats[date_key]["failed"] += 1
            elif execution.status == ExecutionStatus.RUNNING:
                daily_stats[date_key]["running"] += 1

        # Fill in missing dates with zeros
        result_list = []
        for i in range(days):
            date = (datetime.utcnow() - timedelta(days=days - i - 1)).date()
            date_key = date.isoformat()
            if date_key in daily_stats:
                result_list.append(daily_stats[date_key])
            else:
                result_list.append({
                    "date": date_key,
                    "total": 0,
                    "completed": 0,
                    "failed": 0,
                    "running": 0,
                })

        return result_list

    async def _count_table(self, model) -> int:
        """Count rows in a table"""
        result = await self.db.execute(select(func.count()).select_from(model))
        return result.scalar() or 0

    async def _count_executions_by_status(self, status: ExecutionStatus) -> int:
        """Count executions by status"""
        result = await self.db.execute(
            select(func.count())
            .select_from(Execution)
            .where(Execution.status == status)
        )
        return result.scalar() or 0

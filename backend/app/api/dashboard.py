"""
Dashboard API endpoints
"""
from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.agent import Agent
from app.models.agent_team import AgentTeam
from app.models.task import Execution
from app.models.skill import Skill
from app.models.workflow import Workflow

router = APIRouter()


@router.get("/stats")
async def get_dashboard_stats(db: AsyncSession = Depends(get_db)):
    """Get dashboard statistics"""

    # Count totals
    total_workflows = await db.scalar(select(func.count(Workflow.id)))
    total_executions = await db.scalar(select(func.count(Execution.id)))
    total_skills = await db.scalar(select(func.count(Skill.id)))
    total_agents = await db.scalar(select(func.count(Agent.id)))
    total_teams = await db.scalar(select(func.count(AgentTeam.id)))

    # Get popular skills (top 5 by usage count from meta)
    popular_skills_query = (
        select(Skill)
        .order_by(Skill.id.desc())  # 简化：按 ID 倒序，实际应该按使用次数
        .limit(5)
    )
    result = await db.execute(popular_skills_query)
    popular_skills = result.scalars().all()
    popular_skills_data = [
        {
            "id": skill.id,
            "name": skill.name,
            "usage_count": skill.meta.get("usage_count", 0) if skill.meta else 0
        }
        for skill in popular_skills
    ]

    # Get popular agents (top 5)
    popular_agents_query = (
        select(Agent)
        .order_by(Agent.id.desc())
        .limit(5)
    )
    result = await db.execute(popular_agents_query)
    popular_agents = result.scalars().all()
    popular_agents_data = [
        {
            "id": agent.id,
            "name": agent.name,
            "usage_count": agent.meta.get("usage_count", 0) if agent.meta else 0
        }
        for agent in popular_agents
    ]

    # Get recent executions
    recent_executions_query = (
        select(Execution)
        .join(Workflow)
        .order_by(Execution.started_at.desc())
        .limit(10)
    )
    result = await db.execute(recent_executions_query)
    recent_executions = result.scalars().all()

    # Calculate execution stats
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = now - timedelta(days=7)

    # Success rate
    completed_count = await db.scalar(
        select(func.count(Execution.id)).where(Execution.status == "succeeded")
    )
    failed_count = await db.scalar(
        select(func.count(Execution.id)).where(Execution.status == "failed")
    )
    total_finished = (completed_count or 0) + (failed_count or 0)
    success_rate = (completed_count / total_finished * 100) if total_finished > 0 else 0

    # Average duration (for completed executions)
    avg_duration_query = select(
        func.avg(
            func.julianday(Execution.updated_at) - func.julianday(Execution.started_at)
        ) * 86400  # Convert days to seconds
    ).where(
        Execution.status == "succeeded",
        Execution.started_at.isnot(None)
    )
    avg_duration = await db.scalar(avg_duration_query) or 0

    # Today's executions
    total_today = await db.scalar(
        select(func.count(Execution.id)).where(Execution.started_at >= today_start)
    )

    # This week's executions
    total_week = await db.scalar(
        select(func.count(Execution.id)).where(Execution.started_at >= week_start)
    )

    # Format recent executions
    recent_executions_data = []
    for execution in recent_executions:
        duration = None
        if execution.started_at:
            # Calculate duration from started_at to updated_at
            duration = int((execution.updated_at - execution.started_at).total_seconds())

        # Get workflow name
        workflow_query = select(Workflow).where(Workflow.id == execution.workflow_id)
        workflow_result = await db.execute(workflow_query)
        workflow = workflow_result.scalar_one_or_none()

        recent_executions_data.append({
            "id": execution.id,
            "workflow_name": workflow.name if workflow else "Unknown",
            "status": execution.status.value if hasattr(execution.status, 'value') else execution.status,
            "started_at": execution.started_at.isoformat() if execution.started_at else None,
            "completed_at": execution.updated_at.isoformat() if execution.status in ["succeeded", "failed", "cancelled"] else None,
            "duration": duration,
        })

    return {
        "total_workflows": total_workflows or 0,
        "total_executions": total_executions or 0,
        "total_skills": total_skills or 0,
        "total_agents": total_agents or 0,
        "total_teams": total_teams or 0,
        "popular_skills": popular_skills_data,
        "popular_agents": popular_agents_data,
        "recent_executions": recent_executions_data,
        "execution_stats": {
            "success_rate": round(success_rate, 1),
            "avg_duration": int(avg_duration),
            "total_today": total_today or 0,
            "total_week": total_week or 0,
        },
    }

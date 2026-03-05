"""
Dashboard API endpoints
"""
import json
import zlib
from collections import Counter, deque
from datetime import datetime, timedelta
from pathlib import Path
from typing import Tuple

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.agent import Agent
from app.models.agent_team import AgentTeam
from app.models.task import Execution, Task
from app.models.skill import Skill
from app.models.workflow import Workflow

router = APIRouter()


def _collect_local_usage_counts(
    max_files: int = 80,
    max_lines_per_file: int = 400,
) -> Tuple[Counter, Counter]:
    """
    从 Claude 本地会话 JSONL 提取真实 usage：
    - Skill 使用：assistant.message.content[].tool_use(name=Skill).input.skill
    - Agent 使用：assistant.message.content[].tool_use(name=Task).input.subagent_type
    """
    skill_counter: Counter = Counter()
    agent_counter: Counter = Counter()

    projects_dir = Path.home() / ".claude" / "projects"
    if not projects_dir.exists():
        return skill_counter, agent_counter

    session_files = sorted(
        projects_dir.rglob("*.jsonl"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )[:max_files]

    for file_path in session_files:
        recent_lines: deque[str] = deque(maxlen=max_lines_per_file)

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                for line in f:
                    recent_lines.append(line)
        except Exception:
            continue

        for line in recent_lines:
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                continue

            if record.get("type") != "assistant":
                continue

            message = record.get("message")
            if not isinstance(message, dict):
                continue

            content = message.get("content")
            if not isinstance(content, list):
                continue

            for item in content:
                if not isinstance(item, dict) or item.get("type") != "tool_use":
                    continue

                tool_name = item.get("name")
                tool_input = item.get("input") if isinstance(item.get("input"), dict) else {}

                if tool_name == "Skill":
                    skill_name = tool_input.get("skill")
                    if isinstance(skill_name, str) and skill_name.strip():
                        skill_counter[skill_name.strip()] += 1

                if tool_name == "Task":
                    agent_type = tool_input.get("subagent_type")
                    if isinstance(agent_type, str) and agent_type.strip():
                        agent_counter[agent_type.strip()] += 1

    return skill_counter, agent_counter


def _stable_virtual_id(prefix: int, name: str) -> int:
    return prefix + (zlib.crc32(name.encode("utf-8")) % 1_000_000)


@router.get("/stats")
async def get_dashboard_stats(db: AsyncSession = Depends(get_db)):
    """Get dashboard statistics"""

    # Count totals
    total_workflows = await db.scalar(select(func.count(Workflow.id)))
    total_executions = await db.scalar(select(func.count(Execution.id)))
    total_skills = await db.scalar(select(func.count(Skill.id)))
    total_agents = await db.scalar(select(func.count(Agent.id)))
    total_teams = await db.scalar(select(func.count(AgentTeam.id)))
    total_tasks = await db.scalar(select(func.count(Task.id)))

    # 本地真实 usage 统计
    local_skill_usage, local_agent_usage = _collect_local_usage_counts()
    usage_source = "local_transcript" if (local_skill_usage or local_agent_usage) else "fallback_meta"

    # 获取全部技能并合并 usage（优先本地真实 usage）
    skill_rows = (await db.execute(select(Skill.id, Skill.name, Skill.meta))).all()
    skill_usage_items = []
    skill_name_to_id = {}

    for skill_id, skill_name, skill_meta in skill_rows:
        skill_name_to_id[skill_name] = skill_id
        fallback_usage = 0
        if isinstance(skill_meta, dict):
            raw = skill_meta.get("usage_count", 0)
            fallback_usage = raw if isinstance(raw, int) else 0

        usage_count = local_skill_usage.get(skill_name, fallback_usage)
        skill_usage_items.append({
            "id": skill_id,
            "name": skill_name,
            "usage_count": usage_count,
        })

    # 把本地有记录但数据库未同步的 skill 也展示出来
    for skill_name, usage_count in local_skill_usage.items():
        if skill_name not in skill_name_to_id:
            skill_usage_items.append({
                "id": _stable_virtual_id(1_000_000, skill_name),
                "name": skill_name,
                "usage_count": usage_count,
            })

    popular_skills_data = sorted(
        skill_usage_items,
        key=lambda x: (x["usage_count"], x["name"]),
        reverse=True,
    )[:5]

    # 获取全部 agents 并合并 usage（优先本地真实 usage）
    agent_rows = (await db.execute(select(Agent.id, Agent.name, Agent.meta))).all()
    agent_usage_items = []
    agent_name_to_id = {}

    for agent_id, agent_name, agent_meta in agent_rows:
        agent_name_to_id[agent_name] = agent_id
        fallback_usage = 0
        if isinstance(agent_meta, dict):
            raw = agent_meta.get("usage_count", 0)
            fallback_usage = raw if isinstance(raw, int) else 0

        usage_count = local_agent_usage.get(agent_name, fallback_usage)
        agent_usage_items.append({
            "id": agent_id,
            "name": agent_name,
            "usage_count": usage_count,
        })

    # 把本地有记录但数据库未同步的 agent type 也展示
    for agent_name, usage_count in local_agent_usage.items():
        if agent_name not in agent_name_to_id:
            agent_usage_items.append({
                "id": _stable_virtual_id(2_000_000, agent_name),
                "name": agent_name,
                "usage_count": usage_count,
            })

    popular_agents_data = sorted(
        agent_usage_items,
        key=lambda x: (x["usage_count"], x["name"]),
        reverse=True,
    )[:5]

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

    completed_count = await db.scalar(
        select(func.count(Execution.id)).where(Execution.status == "succeeded")
    )
    failed_count = await db.scalar(
        select(func.count(Execution.id)).where(Execution.status == "failed")
    )
    total_finished = (completed_count or 0) + (failed_count or 0)
    success_rate = (completed_count / total_finished * 100) if total_finished > 0 else 0

    avg_duration_query = select(
        func.avg(
            func.julianday(Execution.updated_at) - func.julianday(Execution.started_at)
        ) * 86400
    ).where(
        Execution.status == "succeeded",
        Execution.started_at.isnot(None)
    )
    avg_duration = await db.scalar(avg_duration_query) or 0

    total_today = await db.scalar(
        select(func.count(Execution.id)).where(Execution.started_at >= today_start)
    )

    total_week = await db.scalar(
        select(func.count(Execution.id)).where(Execution.started_at >= week_start)
    )

    # Format recent executions
    recent_executions_data = []
    for execution in recent_executions:
        duration = None
        if execution.started_at:
            duration = int((execution.updated_at - execution.started_at).total_seconds())

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
        "total_tasks": total_tasks or 0,
        "total_teams": total_teams or 0,
        "popular_skills": popular_skills_data,
        "popular_agents": popular_agents_data,
        "recent_executions": recent_executions_data,
        "usage_source": usage_source,
        "usage_warning": None if usage_source == "local_transcript" else "未检测到本地真实 usage 记录，当前热门数据回退为数据库统计",
        "execution_stats": {
            "success_rate": round(success_rate, 1),
            "avg_duration": int(avg_duration),
            "total_today": total_today or 0,
            "total_week": total_week or 0,
        },
    }

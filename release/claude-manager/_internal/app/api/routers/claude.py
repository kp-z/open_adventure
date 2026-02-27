"""
Claude Sync API Router

提供 Claude 环境同步和健康检查的 API 端点
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.sync_service import SyncService
from app.adapters.claude import ClaudeAdapter

router = APIRouter(prefix="/claude", tags=["claude"])


@router.post("/sync")
async def sync_claude_data(session: AsyncSession = Depends(get_db)):
    """
    同步 Claude 环境数据到数据库

    扫描本地 Claude Code 文件系统，将 skills/agents/agent teams 同步到数据库
    """
    sync_service = SyncService(session)
    result = await sync_service.sync_all()
    return result


@router.post("/sync/skills")
async def sync_skills(session: AsyncSession = Depends(get_db)):
    """仅同步技能"""
    sync_service = SyncService(session)
    result = await sync_service.sync_skills()
    return result


@router.post("/sync/agents")
async def sync_agents(session: AsyncSession = Depends(get_db)):
    """仅同步智能体"""
    sync_service = SyncService(session)
    result = await sync_service.sync_agents()
    return result


@router.post("/sync/agent-teams")
async def sync_agent_teams(session: AsyncSession = Depends(get_db)):
    """仅同步智能体队伍"""
    sync_service = SyncService(session)
    result = await sync_service.sync_agent_teams()
    return result


@router.get("/health")
async def check_claude_health():
    """
    检查 Claude 环境健康状态

    检查 Claude CLI 是否可用、配置目录是否可读等
    """
    adapter = ClaudeAdapter()
    health = await adapter.check_health()
    return health

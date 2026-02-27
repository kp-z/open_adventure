"""
Statistics API Routes
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.stats_service import StatsService

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/overview")
async def get_overview(db: AsyncSession = Depends(get_db)):
    """Get overview statistics"""
    service = StatsService(db)
    return await service.get_overview()


@router.get("/executions/recent")
async def get_recent_executions(
    limit: int = 10,
    db: AsyncSession = Depends(get_db)
):
    """Get recent executions"""
    service = StatsService(db)
    executions = await service.get_recent_executions(limit=limit)
    return executions


@router.get("/executions/success-rate")
async def get_success_rate(
    days: int = 7,
    db: AsyncSession = Depends(get_db)
):
    """Get execution success rate for the last N days"""
    service = StatsService(db)
    return await service.get_success_rate(days=days)


@router.get("/executions/daily")
async def get_daily_execution_stats(
    days: int = 7,
    db: AsyncSession = Depends(get_db)
):
    """Get daily execution statistics for the last N days"""
    service = StatsService(db)
    return await service.get_daily_execution_stats(days=days)

"""Health check and system status endpoints."""
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.settings import settings
from app.core.database import get_db, engine

router = APIRouter(tags=["system"])


@router.get("/health")
async def health_check() -> dict:
    """
    Health check endpoint

    Returns system health status.
    """
    return {
        "status": "healthy",
        "app_name": settings.app_name,
        "version": settings.app_version,
    }


@router.get("/health/detailed")
async def detailed_health_check(db: AsyncSession = Depends(get_db)) -> dict:
    """
    详细健康检查

    返回系统详细状态，包括：
    - 数据库连接池状态
    - WebSocket 连接数
    - Terminal 会话数
    """
    # 数据库连接池状态
    pool = engine.pool
    pool_status = {
        "size": pool.size(),
        "checked_in": pool.checkedin(),
        "checked_out": pool.checkedout(),
        "overflow": pool.overflow(),
        "max_overflow": pool._max_overflow,
    }

    # WebSocket 连接数
    try:
        from app.services.websocket_manager import get_connection_manager
        ws_manager = get_connection_manager()
        ws_stats = {
            "total_connections": len(ws_manager.active_connections),
            "execution_connections": len([c for c in ws_manager.active_connections if 'execution' in c]),
            "terminal_connections": len([c for c in ws_manager.active_connections if 'terminal' in c]),
        }
    except Exception as e:
        ws_stats = {"error": str(e)}

    # Terminal 会话数
    try:
        from app.api.terminal import sessions
        terminal_stats = {
            "total_sessions": len(sessions),
            "active_sessions": len([s for s in sessions.values() if s.running]),
        }
    except Exception as e:
        terminal_stats = {"error": str(e)}

    # 数据库连接测试
    db_healthy = False
    try:
        await db.execute(text("SELECT 1"))
        db_healthy = True
    except Exception as e:
        pass

    return {
        "status": "healthy" if db_healthy else "unhealthy",
        "database": {
            "healthy": db_healthy,
            "pool": pool_status,
        },
        "websocket": ws_stats,
        "terminal": terminal_stats,
        "timestamp": datetime.now().isoformat(),
    }


@router.get("/status")
async def system_status() -> dict:
    """
    System status endpoint

    Returns detailed system status including configuration.
    """
    return {
        "status": "operational",
        "app_name": settings.app_name,
        "version": settings.app_version,
        "debug": settings.debug,
        "database": {
            "url": settings.database_url.split("///")[-1] if "///" in settings.database_url else "configured",
        },
        "claude": {
            "cli_path": settings.claude_cli_path,
            "config_dir": str(settings.claude_config_dir),
            "skills_dir": str(settings.claude_skills_dir),
        },
    }

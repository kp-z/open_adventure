"""Health check and system status endpoints."""
from fastapi import APIRouter

from app.config.settings import settings

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

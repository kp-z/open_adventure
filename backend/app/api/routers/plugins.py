"""
Plugin API Router
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.repositories.plugin_repository import PluginRepository
from app.services.plugin_service import PluginService
from app.schemas.plugin import (
    PluginCreate,
    PluginUpdate,
    PluginResponse,
    PluginListResponse
)
from app.models.plugin import PluginStatus

router = APIRouter(prefix="/plugins", tags=["plugins"])


def get_plugin_service(db: AsyncSession = Depends(get_db)) -> PluginService:
    """Get plugin service instance"""
    repository = PluginRepository(db)
    return PluginService(repository)


@router.get("", response_model=PluginListResponse)
async def list_plugins(
    skip: int = 0,
    limit: int = 100,
    status: Optional[PluginStatus] = None,
    enabled: Optional[bool] = None,
    service: PluginService = Depends(get_plugin_service)
):
    """List all plugins with pagination and filters"""
    return await service.list_plugins(skip=skip, limit=limit, status=status, enabled=enabled)


@router.post("", response_model=PluginResponse)
async def create_plugin(
    plugin_data: PluginCreate,
    service: PluginService = Depends(get_plugin_service)
):
    """Create a new plugin"""
    try:
        return await service.create_plugin(plugin_data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/scan", response_model=PluginListResponse)
async def scan_marketplace(
    service: PluginService = Depends(get_plugin_service)
):
    """Scan marketplace directory and sync to database"""
    return await service.scan_marketplace()


@router.post("/check-all-updates", response_model=PluginListResponse)
async def check_all_updates(
    service: PluginService = Depends(get_plugin_service)
):
    """Check for updates for all plugins"""
    return await service.check_all_updates()


@router.get("/{plugin_id}", response_model=PluginResponse)
async def get_plugin(
    plugin_id: int,
    service: PluginService = Depends(get_plugin_service)
):
    """Get plugin by ID"""
    try:
        return await service.get_plugin(plugin_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/{plugin_id}", response_model=PluginResponse)
async def update_plugin(
    plugin_id: int,
    plugin_data: PluginUpdate,
    service: PluginService = Depends(get_plugin_service)
):
    """Update a plugin"""
    try:
        return await service.update_plugin(plugin_id, plugin_data)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{plugin_id}")
async def delete_plugin(
    plugin_id: int,
    remove_files: bool = False,
    service: PluginService = Depends(get_plugin_service)
):
    """Delete a plugin"""
    try:
        success = await service.delete_plugin(plugin_id, remove_files)
        return {"success": success}
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{plugin_id}/check-update", response_model=PluginResponse)
async def check_plugin_update(
    plugin_id: int,
    service: PluginService = Depends(get_plugin_service)
):
    """Check for updates for a single plugin"""
    try:
        return await service.check_update(plugin_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{plugin_id}/install", response_model=PluginResponse)
async def install_plugin(
    plugin_id: int,
    service: PluginService = Depends(get_plugin_service)
):
    """Install a plugin (git clone)"""
    try:
        return await service.install_plugin(plugin_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{plugin_id}/update", response_model=PluginResponse)
async def update_plugin_files(
    plugin_id: int,
    service: PluginService = Depends(get_plugin_service)
):
    """Update plugin files (git pull)"""
    try:
        return await service.update_plugin_files(plugin_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

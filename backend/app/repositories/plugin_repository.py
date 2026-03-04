"""
Plugin Repository
"""
from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.plugin import Plugin, PluginStatus
from app.schemas.plugin import PluginCreate, PluginUpdate


class PluginRepository:
    """Repository for Plugin CRUD operations"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, plugin_data: PluginCreate) -> Plugin:
        """Create a new plugin"""
        plugin_dict = plugin_data.model_dump()
        plugin = Plugin(**plugin_dict)
        self.session.add(plugin)
        await self.session.commit()
        await self.session.refresh(plugin)
        return plugin

    async def get_by_id(self, plugin_id: int) -> Optional[Plugin]:
        """Get plugin by ID"""
        result = await self.session.execute(
            select(Plugin).where(Plugin.id == plugin_id)
        )
        return result.scalar_one_or_none()

    async def get_by_name(self, name: str) -> Optional[Plugin]:
        """Get plugin by name"""
        result = await self.session.execute(
            select(Plugin).where(Plugin.name == name)
        )
        return result.scalar_one_or_none()

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        status: Optional[PluginStatus] = None,
        enabled: Optional[bool] = None
    ) -> tuple[list[Plugin], int]:
        """Get all plugins with pagination and filters"""
        query = select(Plugin)

        # Apply filters
        if status is not None:
            query = query.where(Plugin.status == status)
        if enabled is not None:
            query = query.where(Plugin.enabled == enabled)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()

        # Apply pagination
        query = query.offset(skip).limit(limit).order_by(Plugin.id)

        result = await self.session.execute(query)
        plugins = list(result.scalars().all())

        return plugins, total

    async def update(self, plugin_id: int, plugin_data: PluginUpdate) -> Optional[Plugin]:
        """Update a plugin"""
        plugin = await self.get_by_id(plugin_id)
        if not plugin:
            return None

        update_data = plugin_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(plugin, field, value)

        await self.session.commit()
        await self.session.refresh(plugin)
        return plugin

    async def delete(self, plugin_id: int) -> bool:
        """Delete a plugin"""
        plugin = await self.get_by_id(plugin_id)
        if not plugin:
            return False

        await self.session.delete(plugin)
        await self.session.commit()
        return True

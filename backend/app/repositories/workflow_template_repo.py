"""
Workflow Template Repository
"""
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.workflow import WorkflowTemplate
from app.repositories.base import BaseRepository


class WorkflowTemplateRepository(BaseRepository[WorkflowTemplate]):
    """Repository for workflow template operations"""

    def __init__(self, db: AsyncSession):
        super().__init__(WorkflowTemplate, db)

    async def get_by_name(self, name: str) -> Optional[WorkflowTemplate]:
        """Get workflow template by name"""
        result = await self.db.execute(
            select(WorkflowTemplate).where(WorkflowTemplate.name == name)
        )
        return result.scalar_one_or_none()

    async def get_by_category(self, category: str) -> list[WorkflowTemplate]:
        """Get workflow templates by category"""
        result = await self.db.execute(
            select(WorkflowTemplate).where(WorkflowTemplate.category == category)
        )
        return list(result.scalars().all())

    async def get_public_templates(self) -> list[WorkflowTemplate]:
        """Get all public workflow templates"""
        result = await self.db.execute(
            select(WorkflowTemplate).where(WorkflowTemplate.is_public == True)
        )
        return list(result.scalars().all())

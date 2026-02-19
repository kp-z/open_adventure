"""
Workflow Template Service
"""
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.workflow import WorkflowTemplate
from app.repositories.workflow_template_repo import WorkflowTemplateRepository
from app.schemas.workflow import WorkflowTemplateCreate, WorkflowTemplateUpdate


class WorkflowTemplateService:
    """Service for workflow template operations"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = WorkflowTemplateRepository(db)

    async def create_template(self, template_data: WorkflowTemplateCreate) -> WorkflowTemplate:
        """Create a new workflow template"""
        template = WorkflowTemplate(**template_data.model_dump())
        return await self.repo.create(template)

    async def get_template(self, template_id: int) -> Optional[WorkflowTemplate]:
        """Get workflow template by ID"""
        return await self.repo.get(template_id)

    async def get_template_by_name(self, name: str) -> Optional[WorkflowTemplate]:
        """Get workflow template by name"""
        return await self.repo.get_by_name(name)

    async def get_all_templates(
        self,
        skip: int = 0,
        limit: int = 100,
        category: Optional[str] = None,
        public_only: bool = False
    ) -> tuple[list[WorkflowTemplate], int]:
        """Get all workflow templates with pagination"""
        if category:
            templates = await self.repo.get_by_category(category)
            total = len(templates)
            return templates[skip:skip + limit], total
        elif public_only:
            templates = await self.repo.get_public_templates()
            total = len(templates)
            return templates[skip:skip + limit], total
        else:
            templates = await self.repo.list(skip=skip, limit=limit)
            total = await self.repo.count()
            return list(templates), total

    async def update_template(
        self,
        template_id: int,
        template_data: WorkflowTemplateUpdate
    ) -> Optional[WorkflowTemplate]:
        """Update workflow template"""
        template = await self.repo.get(template_id)
        if not template:
            return None

        update_data = template_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(template, key, value)

        return await self.repo.update(template)

    async def delete_template(self, template_id: int) -> bool:
        """Delete workflow template"""
        template = await self.repo.get(template_id)
        if not template:
            return False

        await self.repo.delete(template)
        return True

    async def create_workflow_from_template(
        self,
        template_id: int
    ) -> Optional[dict]:
        """Get workflow data from template for creating a new workflow"""
        template = await self.repo.get(template_id)
        if not template:
            return None

        return template.workflow_data

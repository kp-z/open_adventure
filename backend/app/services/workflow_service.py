"""
Workflow Service
"""
from typing import Optional

from app.repositories.workflow_repository import WorkflowRepository
from app.schemas.workflow import WorkflowCreate, WorkflowUpdate, WorkflowResponse, WorkflowListResponse
from app.core.exceptions import NotFoundException, ConflictException


class WorkflowService:
    """Service for workflow business logic"""

    def __init__(self, repository: WorkflowRepository):
        self.repository = repository

    async def create_workflow(self, workflow_data: WorkflowCreate) -> WorkflowResponse:
        """Create a new workflow"""
        # Check if workflow with same name already exists
        existing = await self.repository.get_by_name(workflow_data.name)
        if existing:
            raise ConflictException(f"Workflow with name '{workflow_data.name}' already exists")

        workflow = await self.repository.create(workflow_data)
        return WorkflowResponse.model_validate(workflow)

    async def get_workflow(self, workflow_id: int) -> WorkflowResponse:
        """Get workflow by ID"""
        workflow = await self.repository.get_by_id(workflow_id)
        if not workflow:
            raise NotFoundException(f"Workflow with id {workflow_id} not found")
        return WorkflowResponse.model_validate(workflow)

    async def get_workflow_by_name(self, name: str) -> WorkflowResponse:
        """Get workflow by name"""
        workflow = await self.repository.get_by_name(name)
        if not workflow:
            raise NotFoundException(f"Workflow with name '{name}' not found")
        return WorkflowResponse.model_validate(workflow)

    async def list_workflows(
        self,
        skip: int = 0,
        limit: int = 100,
        active: Optional[bool] = None
    ) -> WorkflowListResponse:
        """List all workflows with pagination"""
        workflows, total = await self.repository.get_all(
            skip=skip,
            limit=limit,
            active=active
        )
        return WorkflowListResponse(
            total=total,
            items=[WorkflowResponse.model_validate(workflow) for workflow in workflows]
        )

    async def update_workflow(self, workflow_id: int, workflow_data: WorkflowUpdate) -> WorkflowResponse:
        """Update a workflow"""
        # If name is being updated, check for conflicts
        if workflow_data.name:
            existing = await self.repository.get_by_name(workflow_data.name)
            if existing and existing.id != workflow_id:
                raise ConflictException(f"Workflow with name '{workflow_data.name}' already exists")

        workflow = await self.repository.update(workflow_id, workflow_data)
        if not workflow:
            raise NotFoundException(f"Workflow with id {workflow_id} not found")
        return WorkflowResponse.model_validate(workflow)

    async def delete_workflow(self, workflow_id: int) -> None:
        """Delete a workflow"""
        success = await self.repository.delete(workflow_id)
        if not success:
            raise NotFoundException(f"Workflow with id {workflow_id} not found")

    async def search_workflows(
        self,
        query: str,
        skip: int = 0,
        limit: int = 100
    ) -> WorkflowListResponse:
        """Search workflows by name or description"""
        workflows, total = await self.repository.search(query, skip=skip, limit=limit)
        return WorkflowListResponse(
            total=total,
            items=[WorkflowResponse.model_validate(workflow) for workflow in workflows]
        )

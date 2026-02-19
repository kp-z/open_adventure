"""
Workflow API Router
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.repositories.workflow_repository import WorkflowRepository
from app.services.workflow_service import WorkflowService
from app.schemas.workflow import WorkflowCreate, WorkflowUpdate, WorkflowResponse, WorkflowListResponse

router = APIRouter(prefix="/workflows", tags=["workflows"])


def get_workflow_service(db: AsyncSession = Depends(get_db)) -> WorkflowService:
    """Dependency to get workflow service"""
    repository = WorkflowRepository(db)
    return WorkflowService(repository)


@router.post(
    "",
    response_model=WorkflowResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new workflow"
)
async def create_workflow(
    workflow_data: WorkflowCreate,
    service: WorkflowService = Depends(get_workflow_service)
):
    """Create a new workflow with nodes and edges"""
    return await service.create_workflow(workflow_data)


@router.get(
    "",
    response_model=WorkflowListResponse,
    summary="List all workflows"
)
async def list_workflows(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of items to return"),
    active: Optional[bool] = Query(None, description="Filter by active status"),
    service: WorkflowService = Depends(get_workflow_service)
):
    """List all workflows with pagination"""
    return await service.list_workflows(skip=skip, limit=limit, active=active)


@router.get(
    "/search",
    response_model=WorkflowListResponse,
    summary="Search workflows"
)
async def search_workflows(
    q: str = Query(..., min_length=1, description="Search query"),
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of items to return"),
    service: WorkflowService = Depends(get_workflow_service)
):
    """Search workflows by name or description"""
    return await service.search_workflows(query=q, skip=skip, limit=limit)


@router.get(
    "/{workflow_id}",
    response_model=WorkflowResponse,
    summary="Get workflow by ID"
)
async def get_workflow(
    workflow_id: int,
    service: WorkflowService = Depends(get_workflow_service)
):
    """Get a workflow by ID"""
    return await service.get_workflow(workflow_id)


@router.put(
    "/{workflow_id}",
    response_model=WorkflowResponse,
    summary="Update a workflow"
)
async def update_workflow(
    workflow_id: int,
    workflow_data: WorkflowUpdate,
    service: WorkflowService = Depends(get_workflow_service)
):
    """Update a workflow"""
    return await service.update_workflow(workflow_id, workflow_data)


@router.delete(
    "/{workflow_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a workflow"
)
async def delete_workflow(
    workflow_id: int,
    service: WorkflowService = Depends(get_workflow_service)
):
    """Delete a workflow"""
    await service.delete_workflow(workflow_id)

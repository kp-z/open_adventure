"""
Workflow Template API Routes
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.workflow_template_service import WorkflowTemplateService
from app.schemas.workflow import (
    WorkflowTemplateCreate,
    WorkflowTemplateUpdate,
    WorkflowTemplateResponse,
    WorkflowTemplateListResponse,
)

router = APIRouter(prefix="/workflow-templates", tags=["workflow-templates"])


@router.post("/", response_model=WorkflowTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    template_data: WorkflowTemplateCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new workflow template"""
    service = WorkflowTemplateService(db)

    # Check if template with same name exists
    existing = await service.get_template_by_name(template_data.name)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Template with name '{template_data.name}' already exists"
        )

    template = await service.create_template(template_data)
    return template


@router.get("/", response_model=WorkflowTemplateListResponse)
async def get_templates(
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None,
    public_only: bool = False,
    db: AsyncSession = Depends(get_db)
):
    """Get all workflow templates"""
    service = WorkflowTemplateService(db)
    templates, total = await service.get_all_templates(
        skip=skip,
        limit=limit,
        category=category,
        public_only=public_only
    )
    return WorkflowTemplateListResponse(total=total, items=templates)


@router.get("/{template_id}", response_model=WorkflowTemplateResponse)
async def get_template(
    template_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get workflow template by ID"""
    service = WorkflowTemplateService(db)
    template = await service.get_template(template_id)

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template with id {template_id} not found"
        )

    return template


@router.put("/{template_id}", response_model=WorkflowTemplateResponse)
async def update_template(
    template_id: int,
    template_data: WorkflowTemplateUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update workflow template"""
    service = WorkflowTemplateService(db)

    # Check if name is being changed and if it conflicts
    if template_data.name:
        existing = await service.get_template_by_name(template_data.name)
        if existing and existing.id != template_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Template with name '{template_data.name}' already exists"
            )

    template = await service.update_template(template_id, template_data)

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template with id {template_id} not found"
        )

    return template


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete workflow template"""
    service = WorkflowTemplateService(db)
    success = await service.delete_template(template_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template with id {template_id} not found"
        )


@router.get("/{template_id}/workflow-data")
async def get_template_workflow_data(
    template_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get workflow data from template for creating a new workflow"""
    service = WorkflowTemplateService(db)
    workflow_data = await service.create_workflow_from_template(template_id)

    if not workflow_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template with id {template_id} not found"
        )

    return workflow_data

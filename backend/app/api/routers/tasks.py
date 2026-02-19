"""
Task API Router
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.repositories.task_repository import TaskRepository, ExecutionRepository
from app.services.task_service import TaskService
from app.schemas.task import (
    TaskCreate, TaskUpdate, TaskResponse, TaskListResponse,
    ExecutionCreate, ExecutionResponse, ExecutionListResponse
)
from app.models.task import TaskStatus, ExecutionStatus

router = APIRouter(prefix="/tasks", tags=["tasks"])


def get_task_service(db: AsyncSession = Depends(get_db)) -> TaskService:
    """Dependency to get task service"""
    task_repository = TaskRepository(db)
    execution_repository = ExecutionRepository(db)
    return TaskService(task_repository, execution_repository)


@router.post(
    "",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new task"
)
async def create_task(
    task_data: TaskCreate,
    service: TaskService = Depends(get_task_service)
):
    """Create a new task"""
    return await service.create_task(task_data)


@router.get(
    "",
    response_model=TaskListResponse,
    summary="List all tasks"
)
async def list_tasks(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of items to return"),
    status: Optional[TaskStatus] = Query(None, description="Filter by status"),
    service: TaskService = Depends(get_task_service)
):
    """List all tasks with pagination"""
    return await service.list_tasks(skip=skip, limit=limit, status=status)


@router.get(
    "/{task_id}",
    response_model=TaskResponse,
    summary="Get task by ID"
)
async def get_task(
    task_id: int,
    service: TaskService = Depends(get_task_service)
):
    """Get a task by ID"""
    return await service.get_task(task_id)


@router.put(
    "/{task_id}",
    response_model=TaskResponse,
    summary="Update a task"
)
async def update_task(
    task_id: int,
    task_data: TaskUpdate,
    service: TaskService = Depends(get_task_service)
):
    """Update a task"""
    return await service.update_task(task_id, task_data)


@router.delete(
    "/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a task"
)
async def delete_task(
    task_id: int,
    service: TaskService = Depends(get_task_service)
):
    """Delete a task"""
    await service.delete_task(task_id)


@router.post(
    "/executions",
    response_model=ExecutionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new execution"
)
async def create_execution(
    execution_data: ExecutionCreate,
    service: TaskService = Depends(get_task_service)
):
    """Create a new execution for a task"""
    return await service.create_execution(execution_data)


@router.get(
    "/executions",
    response_model=ExecutionListResponse,
    summary="List all executions"
)
async def list_executions(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of items to return"),
    status: Optional[ExecutionStatus] = Query(None, description="Filter by status"),
    service: TaskService = Depends(get_task_service)
):
    """List all executions with pagination"""
    return await service.list_executions(skip=skip, limit=limit, status=status)


@router.get(
    "/{task_id}/executions",
    response_model=ExecutionListResponse,
    summary="List executions for a task"
)
async def list_task_executions(
    task_id: int,
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of items to return"),
    service: TaskService = Depends(get_task_service)
):
    """List all executions for a specific task"""
    return await service.list_task_executions(task_id=task_id, skip=skip, limit=limit)


@router.get(
    "/executions/{execution_id}",
    response_model=ExecutionResponse,
    summary="Get execution by ID"
)
async def get_execution(
    execution_id: int,
    service: TaskService = Depends(get_task_service)
):
    """Get an execution by ID"""
    return await service.get_execution(execution_id)

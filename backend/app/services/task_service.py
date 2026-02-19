"""
Task Service
"""
from typing import Optional

from app.repositories.task_repository import TaskRepository, ExecutionRepository
from app.schemas.task import (
    TaskCreate, TaskUpdate, TaskResponse, TaskListResponse,
    ExecutionCreate, ExecutionResponse, ExecutionListResponse
)
from app.models.task import TaskStatus, ExecutionStatus
from app.core.exceptions import NotFoundException


class TaskService:
    """Service for task business logic"""

    def __init__(self, task_repository: TaskRepository, execution_repository: ExecutionRepository):
        self.task_repository = task_repository
        self.execution_repository = execution_repository

    async def create_task(self, task_data: TaskCreate) -> TaskResponse:
        """Create a new task"""
        task = await self.task_repository.create(task_data)
        return TaskResponse.model_validate(task)

    async def get_task(self, task_id: int) -> TaskResponse:
        """Get task by ID"""
        task = await self.task_repository.get_by_id(task_id)
        if not task:
            raise NotFoundException(f"Task with id {task_id} not found")
        return TaskResponse.model_validate(task)

    async def list_tasks(
        self,
        skip: int = 0,
        limit: int = 100,
        status: Optional[TaskStatus] = None
    ) -> TaskListResponse:
        """List all tasks with pagination"""
        tasks, total = await self.task_repository.get_all(
            skip=skip,
            limit=limit,
            status=status
        )
        return TaskListResponse(
            total=total,
            items=[TaskResponse.model_validate(task) for task in tasks]
        )

    async def update_task(self, task_id: int, task_data: TaskUpdate) -> TaskResponse:
        """Update a task"""
        task = await self.task_repository.update(task_id, task_data)
        if not task:
            raise NotFoundException(f"Task with id {task_id} not found")
        return TaskResponse.model_validate(task)

    async def delete_task(self, task_id: int) -> None:
        """Delete a task"""
        success = await self.task_repository.delete(task_id)
        if not success:
            raise NotFoundException(f"Task with id {task_id} not found")

    async def create_execution(self, execution_data: ExecutionCreate) -> ExecutionResponse:
        """Create a new execution for a task"""
        # Verify task exists
        task = await self.task_repository.get_by_id(execution_data.task_id)
        if not task:
            raise NotFoundException(f"Task with id {execution_data.task_id} not found")

        execution = await self.execution_repository.create(execution_data)
        return ExecutionResponse.model_validate(execution)

    async def get_execution(self, execution_id: int) -> ExecutionResponse:
        """Get execution by ID"""
        execution = await self.execution_repository.get_by_id(execution_id)
        if not execution:
            raise NotFoundException(f"Execution with id {execution_id} not found")
        return ExecutionResponse.model_validate(execution)

    async def list_executions(
        self,
        skip: int = 0,
        limit: int = 100,
        status: Optional[ExecutionStatus] = None
    ) -> ExecutionListResponse:
        """List all executions with pagination"""
        executions, total = await self.execution_repository.get_all(
            skip=skip,
            limit=limit,
            status=status
        )
        return ExecutionListResponse(
            total=total,
            items=[ExecutionResponse.model_validate(execution) for execution in executions]
        )

    async def list_task_executions(
        self,
        task_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> ExecutionListResponse:
        """List all executions for a specific task"""
        # Verify task exists
        task = await self.task_repository.get_by_id(task_id)
        if not task:
            raise NotFoundException(f"Task with id {task_id} not found")

        executions, total = await self.execution_repository.get_by_task_id(
            task_id=task_id,
            skip=skip,
            limit=limit
        )
        return ExecutionListResponse(
            total=total,
            items=[ExecutionResponse.model_validate(execution) for execution in executions]
        )

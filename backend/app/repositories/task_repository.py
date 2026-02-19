"""
Task Repository
"""
from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.task import Task, Execution, NodeExecution, TaskStatus, ExecutionStatus
from app.schemas.task import TaskCreate, TaskUpdate, ExecutionCreate


class TaskRepository:
    """Repository for Task CRUD operations"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, task_data: TaskCreate) -> Task:
        """Create a new task"""
        task = Task(**task_data.model_dump())
        self.session.add(task)
        await self.session.commit()
        await self.session.refresh(task)
        return task

    async def get_by_id(self, task_id: int) -> Optional[Task]:
        """Get task by ID"""
        result = await self.session.execute(
            select(Task).where(Task.id == task_id)
        )
        return result.scalar_one_or_none()

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        status: Optional[TaskStatus] = None
    ) -> tuple[list[Task], int]:
        """Get all tasks with pagination"""
        query = select(Task)

        # Apply filters
        if status is not None:
            query = query.where(Task.status == status)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()

        # Apply pagination
        query = query.offset(skip).limit(limit).order_by(Task.id.desc())

        result = await self.session.execute(query)
        tasks = list(result.scalars().all())

        return tasks, total

    async def update(self, task_id: int, task_data: TaskUpdate) -> Optional[Task]:
        """Update a task"""
        task = await self.get_by_id(task_id)
        if not task:
            return None

        update_data = task_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(task, field, value)

        await self.session.commit()
        await self.session.refresh(task)
        return task

    async def delete(self, task_id: int) -> bool:
        """Delete a task"""
        task = await self.get_by_id(task_id)
        if not task:
            return False

        await self.session.delete(task)
        await self.session.commit()
        return True


class ExecutionRepository:
    """Repository for Execution CRUD operations"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, execution_data: ExecutionCreate) -> Execution:
        """Create a new execution"""
        execution = Execution(**execution_data.model_dump())
        self.session.add(execution)
        await self.session.commit()
        await self.session.refresh(execution, ["node_executions"])
        return execution

    async def get_by_id(self, execution_id: int) -> Optional[Execution]:
        """Get execution by ID with node executions"""
        result = await self.session.execute(
            select(Execution)
            .options(selectinload(Execution.node_executions))
            .where(Execution.id == execution_id)
        )
        return result.scalar_one_or_none()

    async def get_by_task_id(
        self,
        task_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> tuple[list[Execution], int]:
        """Get all executions for a task"""
        query = select(Execution).options(
            selectinload(Execution.node_executions)
        ).where(Execution.task_id == task_id)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()

        # Apply pagination
        query = query.offset(skip).limit(limit).order_by(Execution.id.desc())

        result = await self.session.execute(query)
        executions = list(result.scalars().all())

        return executions, total

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        status: Optional[ExecutionStatus] = None
    ) -> tuple[list[Execution], int]:
        """Get all executions with pagination"""
        query = select(Execution).options(selectinload(Execution.node_executions))

        # Apply filters
        if status is not None:
            query = query.where(Execution.status == status)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()

        # Apply pagination
        query = query.offset(skip).limit(limit).order_by(Execution.id.desc())

        result = await self.session.execute(query)
        executions = list(result.scalars().all())

        return executions, total

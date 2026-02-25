"""
Team Tasks API Router - 团队任务 API 路由
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.task_scheduler import TaskScheduler
from app.models.team_task import TeamTask


router = APIRouter(prefix="/api/team-tasks", tags=["team-tasks"])
task_scheduler = TaskScheduler()


# Pydantic 模型
class CreateTaskRequest(BaseModel):
    """创建任务请求"""
    team_id: int = Field(..., description="团队 ID")
    title: str = Field(..., description="任务标题", max_length=200)
    description: str = Field(..., description="任务描述")
    priority: int = Field(default=0, description="优先级")
    dependencies: Optional[List[int]] = Field(default=None, description="依赖的任务 ID 列表")


class UpdateTaskRequest(BaseModel):
    """更新任务请求"""
    title: Optional[str] = Field(None, description="任务标题", max_length=200)
    description: Optional[str] = Field(None, description="任务描述")
    priority: Optional[int] = Field(None, description="优先级")
    status: Optional[str] = Field(None, description="状态")


class AssignTaskRequest(BaseModel):
    """分配任务请求"""
    agent_id: int = Field(..., description="Agent ID")


class TaskResponse(BaseModel):
    """任务响应"""
    id: int
    team_id: int
    title: str
    description: str
    assigned_to: Optional[int]
    status: str
    priority: int
    dependencies: List[int]
    created_at: str
    started_at: Optional[str]
    completed_at: Optional[str]

    class Config:
        from_attributes = True


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    request: CreateTaskRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    创建新任务

    Args:
        request: 创建任务请求
        db: 数据库会话

    Returns:
        TaskResponse: 创建的任务
    """
    try:
        task = await task_scheduler.add_task(
            db=db,
            team_id=request.team_id,
            title=request.title,
            description=request.description,
            priority=request.priority,
            dependencies=request.dependencies
        )

        return TaskResponse(
            id=task.id,
            team_id=task.team_id,
            title=task.title,
            description=task.description,
            assigned_to=task.assigned_to,
            status=task.status,
            priority=task.priority,
            dependencies=task.dependencies,
            created_at=task.created_at.isoformat(),
            started_at=task.started_at.isoformat() if task.started_at else None,
            completed_at=task.completed_at.isoformat() if task.completed_at else None
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create task: {str(e)}"
        )


@router.get("/{team_id}", response_model=List[TaskResponse])
async def get_team_tasks(
    team_id: int,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    获取团队的所有任务

    Args:
        team_id: 团队 ID
        status: 可选，按状态过滤
        db: 数据库会话

    Returns:
        List[TaskResponse]: 任务列表
    """
    try:
        tasks = await task_scheduler.get_team_tasks(
            db=db,
            team_id=team_id,
            status=status
        )

        return [
            TaskResponse(
                id=task.id,
                team_id=task.team_id,
                title=task.title,
                description=task.description,
                assigned_to=task.assigned_to,
                status=task.status,
                priority=task.priority,
                dependencies=task.dependencies,
                created_at=task.created_at.isoformat(),
                started_at=task.started_at.isoformat() if task.started_at else None,
                completed_at=task.completed_at.isoformat() if task.completed_at else None
            )
            for task in tasks
        ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get team tasks: {str(e)}"
        )


@router.get("/next/{agent_id}", response_model=Optional[TaskResponse])
async def get_next_task(
    agent_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    获取下一个可执行任务并分配给指定 agent

    Args:
        agent_id: Agent ID
        db: 数据库会话

    Returns:
        Optional[TaskResponse]: 分配的任务，无可用任务返回 None
    """
    try:
        task = await task_scheduler.get_next_task(db=db, agent_id=agent_id)

        if not task:
            return None

        return TaskResponse(
            id=task.id,
            team_id=task.team_id,
            title=task.title,
            description=task.description,
            assigned_to=task.assigned_to,
            status=task.status,
            priority=task.priority,
            dependencies=task.dependencies,
            created_at=task.created_at.isoformat(),
            started_at=task.started_at.isoformat() if task.started_at else None,
            completed_at=task.completed_at.isoformat() if task.completed_at else None
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get next task: {str(e)}"
        )


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int,
    request: UpdateTaskRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    更新任务

    Args:
        task_id: 任务 ID
        request: 更新任务请求
        db: 数据库会话

    Returns:
        TaskResponse: 更新后的任务
    """
    task = await task_scheduler.get_task_by_id(db=db, task_id=task_id)

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task {task_id} not found"
        )

    # 更新字段
    if request.title is not None:
        task.title = request.title
    if request.description is not None:
        task.description = request.description
    if request.priority is not None:
        task.priority = request.priority
    if request.status is not None:
        task.status = request.status

    await db.commit()
    await db.refresh(task)

    return TaskResponse(
        id=task.id,
        team_id=task.team_id,
        title=task.title,
        description=task.description,
        assigned_to=task.assigned_to,
        status=task.status,
        priority=task.priority,
        dependencies=task.dependencies,
        created_at=task.created_at.isoformat(),
        started_at=task.started_at.isoformat() if task.started_at else None,
        completed_at=task.completed_at.isoformat() if task.completed_at else None
    )


@router.post("/{task_id}/complete", response_model=TaskResponse)
async def complete_task(
    task_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    标记任务为完成

    Args:
        task_id: 任务 ID
        db: 数据库会话

    Returns:
        TaskResponse: 完成的任务
    """
    task = await task_scheduler.complete_task(db=db, task_id=task_id)

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task {task_id} not found"
        )

    return TaskResponse(
        id=task.id,
        team_id=task.team_id,
        title=task.title,
        description=task.description,
        assigned_to=task.assigned_to,
        status=task.status,
        priority=task.priority,
        dependencies=task.dependencies,
        created_at=task.created_at.isoformat(),
        started_at=task.started_at.isoformat() if task.started_at else None,
        completed_at=task.completed_at.isoformat() if task.completed_at else None
    )


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    删除任务

    Args:
        task_id: 任务 ID
        db: 数据库会话
    """
    task = await task_scheduler.get_task_by_id(db=db, task_id=task_id)

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task {task_id} not found"
        )

    await db.delete(task)
    await db.commit()

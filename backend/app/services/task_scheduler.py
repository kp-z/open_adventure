"""
Task Scheduler - 团队任务调度服务

实现任务调度功能：
- 优先级队列
- 依赖关系管理
- 任务分配
"""
import asyncio
from typing import Optional, List, Dict, Set
from datetime import datetime
from heapq import heappush, heappop

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models.team_task import TeamTask


class TaskScheduler:
    """任务调度器"""

    def __init__(self):
        # 优先级队列：(priority, task_id, task)
        # 注意：Python heapq 是最小堆，所以 priority 越小优先级越高
        # 我们使用负数来实现最大堆（priority 越大越优先）
        self._task_queue: List[tuple] = []
        self._dependency_graph: Dict[int, Set[int]] = {}  # task_id -> set of dependent task_ids
        self._lock = asyncio.Lock()

    async def add_task(
        self,
        db: AsyncSession,
        team_id: int,
        title: str,
        description: str,
        priority: int = 0,
        dependencies: Optional[List[int]] = None
    ) -> TeamTask:
        """
        创建新任务

        Args:
            db: 数据库会话
            team_id: 团队 ID
            title: 任务标题
            description: 任务描述
            priority: 优先级（数字越大优先级越高）
            dependencies: 依赖的任务 ID 列表

        Returns:
            TeamTask: 创建的任务
        """
        task = TeamTask(
            team_id=team_id,
            title=title,
            description=description,
            priority=priority,
            dependencies=dependencies or [],
            status="pending"
        )

        db.add(task)
        await db.commit()
        await db.refresh(task)

        # 尝试调度任务
        await self.schedule_task(db, task)

        return task

    async def schedule_task(
        self,
        db: AsyncSession,
        task: TeamTask
    ) -> bool:
        """
        调度任务（检查依赖并加入队列）

        Args:
            db: 数据库会话
            task: 要调度的任务

        Returns:
            bool: 是否成功调度（False 表示有未完成的依赖）
        """
        async with self._lock:
            # 检查依赖
            if await self._has_unresolved_dependencies(db, task):
                return False

            # 加入优先级队列（使用负数实现最大堆）
            heappush(self._task_queue, (-task.priority, task.id, task))

            # 更新依赖图
            for dep_id in task.dependencies:
                if dep_id not in self._dependency_graph:
                    self._dependency_graph[dep_id] = set()
                self._dependency_graph[dep_id].add(task.id)

            return True

    async def get_next_task(
        self,
        db: AsyncSession,
        agent_id: int
    ) -> Optional[TeamTask]:
        """
        获取下一个可执行任务并分配给指定 agent

        Args:
            db: 数据库会话
            agent_id: Agent ID

        Returns:
            Optional[TeamTask]: 分配的任务，无可用任务返回 None
        """
        async with self._lock:
            while self._task_queue:
                neg_priority, task_id, task = heappop(self._task_queue)

                # 再次检查依赖（可能已变化）
                if not await self._has_unresolved_dependencies(db, task):
                    # 分配任务
                    task.assigned_to = agent_id
                    task.status = "in_progress"
                    task.started_at = datetime.utcnow()

                    await db.commit()
                    await db.refresh(task)

                    return task

            return None

    async def complete_task(
        self,
        db: AsyncSession,
        task_id: int
    ) -> Optional[TeamTask]:
        """
        标记任务为完成，并尝试调度依赖它的任务

        Args:
            db: 数据库会话
            task_id: 任务 ID

        Returns:
            Optional[TeamTask]: 完成的任务
        """
        result = await db.execute(
            select(TeamTask).where(TeamTask.id == task_id)
        )
        task = result.scalar_one_or_none()

        if not task:
            return None

        task.status = "completed"
        task.completed_at = datetime.utcnow()
        await db.commit()
        await db.refresh(task)

        # 检查是否有任务依赖这个任务
        if task_id in self._dependency_graph:
            dependent_task_ids = self._dependency_graph[task_id]

            # 尝试调度所有依赖任务
            for dep_task_id in dependent_task_ids:
                dep_result = await db.execute(
                    select(TeamTask).where(TeamTask.id == dep_task_id)
                )
                dep_task = dep_result.scalar_one_or_none()

                if dep_task and dep_task.status == "pending":
                    await self.schedule_task(db, dep_task)

            # 清理依赖图
            del self._dependency_graph[task_id]

        return task

    async def fail_task(
        self,
        db: AsyncSession,
        task_id: int,
        error_message: Optional[str] = None
    ) -> Optional[TeamTask]:
        """
        标记任务为失败

        Args:
            db: 数据库会话
            task_id: 任务 ID
            error_message: 错误信息

        Returns:
            Optional[TeamTask]: 失败的任务
        """
        result = await db.execute(
            select(TeamTask).where(TeamTask.id == task_id)
        )
        task = result.scalar_one_or_none()

        if not task:
            return None

        task.status = "failed"
        task.completed_at = datetime.utcnow()

        # 可以将错误信息存储在 description 或添加新字段
        if error_message:
            task.description += f"\n\nError: {error_message}"

        await db.commit()
        await db.refresh(task)

        return task

    async def get_team_tasks(
        self,
        db: AsyncSession,
        team_id: int,
        status: Optional[str] = None
    ) -> List[TeamTask]:
        """
        获取团队的所有任务

        Args:
            db: 数据库会话
            team_id: 团队 ID
            status: 可选，按状态过滤

        Returns:
            List[TeamTask]: 任务列表
        """
        query = select(TeamTask).where(TeamTask.team_id == team_id)

        if status:
            query = query.where(TeamTask.status == status)

        query = query.order_by(TeamTask.priority.desc(), TeamTask.created_at)

        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_agent_tasks(
        self,
        db: AsyncSession,
        agent_id: int,
        status: Optional[str] = None
    ) -> List[TeamTask]:
        """
        获取分配给指定 agent 的任务

        Args:
            db: 数据库会话
            agent_id: Agent ID
            status: 可选，按状态过滤

        Returns:
            List[TeamTask]: 任务列表
        """
        query = select(TeamTask).where(TeamTask.assigned_to == agent_id)

        if status:
            query = query.where(TeamTask.status == status)

        query = query.order_by(TeamTask.priority.desc(), TeamTask.created_at)

        result = await db.execute(query)
        return list(result.scalars().all())

    async def _has_unresolved_dependencies(
        self,
        db: AsyncSession,
        task: TeamTask
    ) -> bool:
        """
        检查任务是否有未完成的依赖

        Args:
            db: 数据库会话
            task: 要检查的任务

        Returns:
            bool: True 表示有未完成的依赖
        """
        if not task.dependencies:
            return False

        for dep_id in task.dependencies:
            result = await db.execute(
                select(TeamTask).where(TeamTask.id == dep_id)
            )
            dep_task = result.scalar_one_or_none()

            if not dep_task or dep_task.status != "completed":
                return True

        return False

    async def get_task_by_id(
        self,
        db: AsyncSession,
        task_id: int
    ) -> Optional[TeamTask]:
        """
        根据 ID 获取任务

        Args:
            db: 数据库会话
            task_id: 任务 ID

        Returns:
            Optional[TeamTask]: 任务对象
        """
        result = await db.execute(
            select(TeamTask).where(TeamTask.id == task_id)
        )
        return result.scalar_one_or_none()

"""
Agent Session Service (Async Version)
管理 Agent 运行会话的生命周期 - 异步版本
"""
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
import uuid

from app.models.task import Execution, ExecutionStatus, ExecutionType, Task, TaskStatus


class AgentSessionServiceAsync:
    """Agent Session 管理服务 - 异步版本"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_or_create_session(self, agent_id: int) -> Execution:
        """
        获取或创建 Agent 会话

        如果存在活跃的会话，返回现有会话并更新活动时间
        如果不存在，创建新的会话
        """
        # 查找活跃的会话
        active_session = await self.get_active_session(agent_id)

        if active_session:
            # 更新最后活动时间
            await self.update_activity(active_session.session_id)
            return active_session

        # 创建新会话
        session_id = str(uuid.uuid4())

        # 创建一个虚拟 Task（用于 Execution 的外键约束）
        task = Task(
            title=f"Agent Test Session - {agent_id}",
            description=f"Agent test session for agent {agent_id}",
            status=TaskStatus.RUNNING
        )
        self.db.add(task)
        await self.db.flush()

        # 创建 Execution
        execution = Execution(
            task_id=task.id,
            workflow_id=1,  # 虚拟 workflow_id
            execution_type=ExecutionType.AGENT_TEST,
            agent_id=agent_id,
            status=ExecutionStatus.RUNNING,
            session_id=session_id,
            last_activity_at=datetime.utcnow(),
            is_background=True,
            started_at=datetime.utcnow()
        )

        self.db.add(execution)
        await self.db.commit()
        await self.db.refresh(execution)

        return execution

    async def get_active_session(self, agent_id: int) -> Optional[Execution]:
        """
        获取 Agent 的活跃会话

        活跃会话定义：
        - execution_type = AGENT_TEST
        - agent_id 匹配
        - status = RUNNING
        - is_background = True
        - last_activity_at 在 30 分钟内

        如果有多个活跃会话，返回最新的一个
        """
        thirty_minutes_ago = datetime.utcnow() - timedelta(minutes=30)

        stmt = select(Execution).where(
            and_(
                Execution.execution_type == ExecutionType.AGENT_TEST,
                Execution.agent_id == agent_id,
                Execution.status == ExecutionStatus.RUNNING,
                Execution.is_background == True,
                Execution.last_activity_at >= thirty_minutes_ago
            )
        ).order_by(Execution.last_activity_at.desc()).limit(1)

        result = await self.db.execute(stmt)
        execution = result.scalar_one_or_none()

        return execution

    async def update_activity(self, session_id: str) -> None:
        """更新会话的最后活动时间"""
        stmt = select(Execution).where(Execution.session_id == session_id)
        result = await self.db.execute(stmt)
        execution = result.scalar_one_or_none()

        if execution:
            execution.last_activity_at = datetime.utcnow()
            await self.db.commit()

    async def stop_session(self, session_id: str) -> bool:
        """
        停止会话

        将 Execution 状态更新为 CANCELLED
        """
        stmt = select(Execution).where(Execution.session_id == session_id)
        result = await self.db.execute(stmt)
        execution = result.scalar_one_or_none()

        if execution:
            execution.status = ExecutionStatus.CANCELLED
            execution.finished_at = datetime.utcnow()
            await self.db.commit()
            return True

        return False

    async def stop_agent_session(self, agent_id: int) -> bool:
        """
        停止指定 Agent 的活跃会话
        """
        active_session = await self.get_active_session(agent_id)

        if active_session:
            return await self.stop_session(active_session.session_id)

        return False

    async def cleanup_inactive_sessions(self) -> int:
        """
        清理超过 30 分钟无活动的会话

        返回清理的会话数量
        """
        thirty_minutes_ago = datetime.utcnow() - timedelta(minutes=30)

        # 查找所有超时的会话
        stmt = select(Execution).where(
            and_(
                Execution.execution_type == ExecutionType.AGENT_TEST,
                Execution.status == ExecutionStatus.RUNNING,
                Execution.is_background == True,
                Execution.last_activity_at < thirty_minutes_ago
            )
        )

        result = await self.db.execute(stmt)
        inactive_sessions = result.scalars().all()

        # 批量更新状态
        count = 0
        for execution in inactive_sessions:
            execution.status = ExecutionStatus.CANCELLED
            execution.finished_at = datetime.utcnow()
            count += 1

        if count > 0:
            await self.db.commit()

        return count

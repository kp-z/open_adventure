"""
Team State Manager - 团队状态管理服务

实现团队状态管理功能：
- 成员状态跟踪
- 团队状态管理
- 状态同步
"""
from typing import Optional, Dict
from datetime import datetime
from enum import Enum

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.team_state import TeamState


class TeamStatus(str, Enum):
    """团队状态枚举"""
    IDLE = "idle"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    ERROR = "error"


class MemberStatus(str, Enum):
    """成员状态枚举"""
    AVAILABLE = "available"
    BUSY = "busy"
    OFFLINE = "offline"
    ERROR = "error"


class TeamStateManager:
    """团队状态管理器"""

    def __init__(self):
        # 内存缓存，用于快速访问
        self._state_cache: Dict[int, TeamState] = {}

    async def get_or_create_state(
        self,
        db: AsyncSession,
        team_id: int
    ) -> TeamState:
        """
        获取或创建团队状态

        Args:
            db: 数据库会话
            team_id: 团队 ID

        Returns:
            TeamState: 团队状态对象
        """
        # 先检查缓存
        if team_id in self._state_cache:
            return self._state_cache[team_id]

        # 从数据库查询
        result = await db.execute(
            select(TeamState).where(TeamState.team_id == team_id)
        )
        state = result.scalar_one_or_none()

        # 如果不存在则创建
        if not state:
            state = TeamState(
                team_id=team_id,
                status=TeamStatus.IDLE.value,
                member_states={},
                current_tasks={}
            )
            db.add(state)
            await db.commit()
            await db.refresh(state)

        # 更新缓存
        self._state_cache[team_id] = state

        return state

    async def update_team_status(
        self,
        db: AsyncSession,
        team_id: int,
        status: TeamStatus
    ) -> TeamState:
        """
        更新团队状态

        Args:
            db: 数据库会话
            team_id: 团队 ID
            status: 新状态

        Returns:
            TeamState: 更新后的状态
        """
        state = await self.get_or_create_state(db, team_id)

        state.status = status.value
        state.updated_at = datetime.utcnow()

        await db.commit()
        await db.refresh(state)

        # 更新缓存
        self._state_cache[team_id] = state

        return state

    async def update_member_status(
        self,
        db: AsyncSession,
        team_id: int,
        agent_id: int,
        status: MemberStatus
    ) -> TeamState:
        """
        更新成员状态

        Args:
            db: 数据库会话
            team_id: 团队 ID
            agent_id: Agent ID
            status: 新状态

        Returns:
            TeamState: 更新后的团队状态
        """
        state = await self.get_or_create_state(db, team_id)

        # 更新成员状态
        member_states = state.member_states.copy()
        member_states[str(agent_id)] = status.value
        state.member_states = member_states

        state.updated_at = datetime.utcnow()

        await db.commit()
        await db.refresh(state)

        # 更新缓存
        self._state_cache[team_id] = state

        return state

    async def assign_task_to_member(
        self,
        db: AsyncSession,
        team_id: int,
        agent_id: int,
        task_id: int
    ) -> TeamState:
        """
        分配任务给成员

        Args:
            db: 数据库会话
            team_id: 团队 ID
            agent_id: Agent ID
            task_id: 任务 ID

        Returns:
            TeamState: 更新后的团队状态
        """
        state = await self.get_or_create_state(db, team_id)

        # 更新当前任务
        current_tasks = state.current_tasks.copy()
        current_tasks[str(agent_id)] = task_id
        state.current_tasks = current_tasks

        # 同时更新成员状态为 BUSY
        member_states = state.member_states.copy()
        member_states[str(agent_id)] = MemberStatus.BUSY.value
        state.member_states = member_states

        state.updated_at = datetime.utcnow()

        await db.commit()
        await db.refresh(state)

        # 更新缓存
        self._state_cache[team_id] = state

        return state

    async def complete_member_task(
        self,
        db: AsyncSession,
        team_id: int,
        agent_id: int
    ) -> TeamState:
        """
        完成成员的当前任务

        Args:
            db: 数据库会话
            team_id: 团队 ID
            agent_id: Agent ID

        Returns:
            TeamState: 更新后的团队状态
        """
        state = await self.get_or_create_state(db, team_id)

        # 移除当前任务
        current_tasks = state.current_tasks.copy()
        if str(agent_id) in current_tasks:
            del current_tasks[str(agent_id)]
        state.current_tasks = current_tasks

        # 更新成员状态为 AVAILABLE
        member_states = state.member_states.copy()
        member_states[str(agent_id)] = MemberStatus.AVAILABLE.value
        state.member_states = member_states

        state.updated_at = datetime.utcnow()

        await db.commit()
        await db.refresh(state)

        # 更新缓存
        self._state_cache[team_id] = state

        return state

    async def get_team_state(
        self,
        db: AsyncSession,
        team_id: int
    ) -> Optional[TeamState]:
        """
        获取团队状态

        Args:
            db: 数据库会话
            team_id: 团队 ID

        Returns:
            Optional[TeamState]: 团队状态
        """
        return await self.get_or_create_state(db, team_id)

    async def get_member_status(
        self,
        db: AsyncSession,
        team_id: int,
        agent_id: int
    ) -> Optional[str]:
        """
        获取成员状态

        Args:
            db: 数据库会话
            team_id: 团队 ID
            agent_id: Agent ID

        Returns:
            Optional[str]: 成员状态
        """
        state = await self.get_or_create_state(db, team_id)
        return state.member_states.get(str(agent_id))

    async def get_member_current_task(
        self,
        db: AsyncSession,
        team_id: int,
        agent_id: int
    ) -> Optional[int]:
        """
        获取成员当前任务

        Args:
            db: 数据库会话
            team_id: 团队 ID
            agent_id: Agent ID

        Returns:
            Optional[int]: 任务 ID
        """
        state = await self.get_or_create_state(db, team_id)
        return state.current_tasks.get(str(agent_id))

    async def is_team_idle(
        self,
        db: AsyncSession,
        team_id: int
    ) -> bool:
        """
        检查团队是否空闲（所有成员都是 AVAILABLE 或 OFFLINE）

        Args:
            db: 数据库会话
            team_id: 团队 ID

        Returns:
            bool: 是否空闲
        """
        state = await self.get_or_create_state(db, team_id)

        for status in state.member_states.values():
            if status not in [MemberStatus.AVAILABLE.value, MemberStatus.OFFLINE.value]:
                return False

        return True

    def clear_cache(self, team_id: Optional[int] = None):
        """
        清除缓存

        Args:
            team_id: 可选，指定团队 ID 只清除该团队的缓存
        """
        if team_id:
            if team_id in self._state_cache:
                del self._state_cache[team_id]
        else:
            self._state_cache.clear()

"""
Message Service - 团队消息传递服务

实现团队成员间的消息传递功能：
- 点对点消息（P2P）
- 广播消息（Broadcast）
- 消息队列管理
"""
import asyncio
from typing import Dict, Optional, List
from datetime import datetime
from enum import Enum

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models.team_message import TeamMessage


class MessageType(str, Enum):
    """消息类型枚举"""
    TASK_ASSIGNMENT = "task_assignment"
    STATUS_UPDATE = "status_update"
    DATA_TRANSFER = "data_transfer"
    ERROR_NOTIFICATION = "error_notification"
    HEARTBEAT = "heartbeat"


class Message:
    """内存消息对象"""
    def __init__(
        self,
        from_agent_id: int,
        to_agent_id: Optional[int],
        msg_type: MessageType,
        content: dict,
        priority: int = 0
    ):
        self.from_agent_id = from_agent_id
        self.to_agent_id = to_agent_id
        self.type = msg_type
        self.content = content
        self.priority = priority
        self.timestamp = datetime.utcnow()


class MessageQueue:
    """内存消息队列"""
    def __init__(self):
        self._queues: Dict[int, asyncio.Queue] = {}
        self._lock = asyncio.Lock()

    async def get_queue(self, agent_id: int) -> asyncio.Queue:
        """获取或创建指定 agent 的消息队列"""
        async with self._lock:
            if agent_id not in self._queues:
                self._queues[agent_id] = asyncio.Queue()
            return self._queues[agent_id]

    async def send(self, to_agent_id: int, message: Message):
        """发送消息到指定成员"""
        queue = await self.get_queue(to_agent_id)
        await queue.put(message)

    async def receive(self, agent_id: int, timeout: Optional[float] = None) -> Optional[Message]:
        """接收消息（阻塞）"""
        queue = await self.get_queue(agent_id)
        try:
            if timeout:
                return await asyncio.wait_for(queue.get(), timeout=timeout)
            else:
                return await queue.get()
        except asyncio.TimeoutError:
            return None

    async def broadcast(self, agent_ids: List[int], message: Message):
        """广播消息到多个成员"""
        for agent_id in agent_ids:
            if agent_id != message.from_agent_id:  # 不发送给自己
                await self.send(agent_id, message)


class MessageService:
    """消息服务"""

    def __init__(self):
        self._message_queue = MessageQueue()

    async def send_message(
        self,
        db: AsyncSession,
        team_id: int,
        from_agent_id: int,
        to_agent_id: int,
        msg_type: MessageType,
        content: dict,
        priority: int = 0
    ) -> TeamMessage:
        """
        发送点对点消息

        Args:
            db: 数据库会话
            team_id: 团队 ID
            from_agent_id: 发送者 ID
            to_agent_id: 接收者 ID
            msg_type: 消息类型
            content: 消息内容
            priority: 优先级（0=普通, 1=高, 2=紧急）

        Returns:
            TeamMessage: 创建的消息记录
        """
        # 创建内存消息
        message = Message(
            from_agent_id=from_agent_id,
            to_agent_id=to_agent_id,
            msg_type=msg_type,
            content=content,
            priority=priority
        )

        # 发送到内存队列
        await self._message_queue.send(to_agent_id, message)

        # 持久化到数据库
        db_message = TeamMessage(
            team_id=team_id,
            from_agent_id=from_agent_id,
            to_agent_id=to_agent_id,
            type=msg_type.value,
            content=content,
            priority=priority,
            read=False
        )
        db.add(db_message)
        await db.commit()
        await db.refresh(db_message)

        return db_message

    async def broadcast_message(
        self,
        db: AsyncSession,
        team_id: int,
        from_agent_id: int,
        agent_ids: List[int],
        msg_type: MessageType,
        content: dict,
        priority: int = 0
    ) -> List[TeamMessage]:
        """
        广播消息到多个成员

        Args:
            db: 数据库会话
            team_id: 团队 ID
            from_agent_id: 发送者 ID
            agent_ids: 接收者 ID 列表
            msg_type: 消息类型
            content: 消息内容
            priority: 优先级

        Returns:
            List[TeamMessage]: 创建的消息记录列表
        """
        # 创建内存消息
        message = Message(
            from_agent_id=from_agent_id,
            to_agent_id=None,  # None 表示广播
            msg_type=msg_type,
            content=content,
            priority=priority
        )

        # 广播到内存队列
        await self._message_queue.broadcast(agent_ids, message)

        # 持久化到数据库（为每个接收者创建一条记录）
        db_messages = []
        for agent_id in agent_ids:
            if agent_id != from_agent_id:  # 不发送给自己
                db_message = TeamMessage(
                    team_id=team_id,
                    from_agent_id=from_agent_id,
                    to_agent_id=agent_id,
                    type=msg_type.value,
                    content=content,
                    priority=priority,
                    read=False
                )
                db.add(db_message)
                db_messages.append(db_message)

        await db.commit()
        for msg in db_messages:
            await db.refresh(msg)

        return db_messages

    async def receive_message(
        self,
        agent_id: int,
        timeout: Optional[float] = None
    ) -> Optional[Message]:
        """
        接收消息（从内存队列）

        Args:
            agent_id: 接收者 ID
            timeout: 超时时间（秒）

        Returns:
            Message: 接收到的消息，超时返回 None
        """
        return await self._message_queue.receive(agent_id, timeout)

    async def get_message_history(
        self,
        db: AsyncSession,
        team_id: int,
        agent_id: Optional[int] = None,
        limit: int = 100
    ) -> List[TeamMessage]:
        """
        获取消息历史（从数据库）

        Args:
            db: 数据库会话
            team_id: 团队 ID
            agent_id: 可选，指定成员 ID 只获取该成员的消息
            limit: 返回数量限制

        Returns:
            List[TeamMessage]: 消息列表
        """
        query = select(TeamMessage).where(TeamMessage.team_id == team_id)

        if agent_id:
            query = query.where(
                and_(
                    TeamMessage.to_agent_id == agent_id
                )
            )

        query = query.order_by(TeamMessage.created_at.desc()).limit(limit)

        result = await db.execute(query)
        return list(result.scalars().all())

    async def mark_as_read(
        self,
        db: AsyncSession,
        message_id: int
    ) -> Optional[TeamMessage]:
        """
        标记消息为已读

        Args:
            db: 数据库会话
            message_id: 消息 ID

        Returns:
            TeamMessage: 更新后的消息
        """
        result = await db.execute(
            select(TeamMessage).where(TeamMessage.id == message_id)
        )
        message = result.scalar_one_or_none()

        if message:
            message.read = True
            await db.commit()
            await db.refresh(message)

        return message

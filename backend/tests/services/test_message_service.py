"""
Tests for MessageService
"""
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.services.message_service import MessageService, MessageType
from app.models.team_message import TeamMessage
from app.models.agent_team import AgentTeam


# 测试数据库配置
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture
async def db_session():
    """创建测试数据库会话"""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session() as session:
        yield session

    await engine.dispose()


@pytest.fixture
async def test_team(db_session: AsyncSession):
    """创建测试团队"""
    team = AgentTeam(
        name="Test Team",
        description="A test team",
        members=[1, 2, 3],
        tags=["test"]
    )
    db_session.add(team)
    await db_session.commit()
    await db_session.refresh(team)
    return team


@pytest.mark.asyncio
async def test_send_message(db_session: AsyncSession, test_team: AgentTeam):
    """测试发送点对点消息"""
    service = MessageService()

    message = await service.send_message(
        db=db_session,
        team_id=test_team.id,
        from_agent_id=1,
        to_agent_id=2,
        msg_type=MessageType.TASK_ASSIGNMENT,
        content={"task_id": 123, "description": "Test task"},
        priority=1
    )

    assert message.id is not None
    assert message.team_id == test_team.id
    assert message.from_agent_id == 1
    assert message.to_agent_id == 2
    assert message.type == MessageType.TASK_ASSIGNMENT.value
    assert message.content["task_id"] == 123
    assert message.priority == 1
    assert message.read is False


@pytest.mark.asyncio
async def test_broadcast_message(db_session: AsyncSession, test_team: AgentTeam):
    """测试广播消息"""
    service = MessageService()

    messages = await service.broadcast_message(
        db=db_session,
        team_id=test_team.id,
        from_agent_id=1,
        agent_ids=[1, 2, 3],
        msg_type=MessageType.STATUS_UPDATE,
        content={"status": "completed"},
        priority=0
    )

    # 应该创建 2 条消息（不包括发送者自己）
    assert len(messages) == 2
    assert all(msg.team_id == test_team.id for msg in messages)
    assert all(msg.from_agent_id == 1 for msg in messages)
    assert all(msg.type == MessageType.STATUS_UPDATE.value for msg in messages)


@pytest.mark.asyncio
async def test_get_message_history(db_session: AsyncSession, test_team: AgentTeam):
    """测试获取消息历史"""
    service = MessageService()

    # 发送多条消息
    await service.send_message(
        db=db_session,
        team_id=test_team.id,
        from_agent_id=1,
        to_agent_id=2,
        msg_type=MessageType.DATA_TRANSFER,
        content={"data": "test1"}
    )

    await service.send_message(
        db=db_session,
        team_id=test_team.id,
        from_agent_id=2,
        to_agent_id=1,
        msg_type=MessageType.DATA_TRANSFER,
        content={"data": "test2"}
    )

    # 获取所有消息
    messages = await service.get_message_history(
        db=db_session,
        team_id=test_team.id
    )

    assert len(messages) == 2

    # 获取特定成员的消息
    agent2_messages = await service.get_message_history(
        db=db_session,
        team_id=test_team.id,
        agent_id=2
    )

    assert len(agent2_messages) == 1
    assert agent2_messages[0].to_agent_id == 2


@pytest.mark.asyncio
async def test_mark_as_read(db_session: AsyncSession, test_team: AgentTeam):
    """测试标记消息为已读"""
    service = MessageService()

    message = await service.send_message(
        db=db_session,
        team_id=test_team.id,
        from_agent_id=1,
        to_agent_id=2,
        msg_type=MessageType.HEARTBEAT,
        content={}
    )

    assert message.read is False

    # 标记为已读
    updated_message = await service.mark_as_read(
        db=db_session,
        message_id=message.id
    )

    assert updated_message is not None
    assert updated_message.read is True


@pytest.mark.asyncio
async def test_receive_message_timeout(db_session: AsyncSession):
    """测试接收消息超时"""
    service = MessageService()

    # 尝试接收消息（应该超时）
    message = await service.receive_message(agent_id=999, timeout=0.1)

    assert message is None

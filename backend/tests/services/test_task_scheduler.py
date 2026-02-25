"""
Tests for TaskScheduler
"""
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.services.task_scheduler import TaskScheduler
from app.models.team_task import TeamTask
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
async def test_add_task(db_session: AsyncSession, test_team: AgentTeam):
    """测试创建任务"""
    scheduler = TaskScheduler()

    task = await scheduler.add_task(
        db=db_session,
        team_id=test_team.id,
        title="Test Task",
        description="A test task",
        priority=1
    )

    assert task.id is not None
    assert task.team_id == test_team.id
    assert task.title == "Test Task"
    assert task.status == "pending"
    assert task.priority == 1
    assert task.dependencies == []


@pytest.mark.asyncio
async def test_schedule_task_without_dependencies(db_session: AsyncSession, test_team: AgentTeam):
    """测试调度无依赖的任务"""
    scheduler = TaskScheduler()

    task = await scheduler.add_task(
        db=db_session,
        team_id=test_team.id,
        title="Task 1",
        description="First task",
        priority=1
    )

    # 任务应该被成功调度
    assert task.status == "pending"


@pytest.mark.asyncio
async def test_schedule_task_with_dependencies(db_session: AsyncSession, test_team: AgentTeam):
    """测试调度有依赖的任务"""
    scheduler = TaskScheduler()

    # 创建第一个任务
    task1 = await scheduler.add_task(
        db=db_session,
        team_id=test_team.id,
        title="Task 1",
        description="First task",
        priority=1
    )

    # 创建依赖 task1 的任务
    task2 = await scheduler.add_task(
        db=db_session,
        team_id=test_team.id,
        title="Task 2",
        description="Second task",
        priority=1,
        dependencies=[task1.id]
    )

    # task2 应该处于 pending 状态（因为 task1 未完成）
    assert task2.status == "pending"


@pytest.mark.asyncio
async def test_get_next_task(db_session: AsyncSession, test_team: AgentTeam):
    """测试获取下一个任务"""
    scheduler = TaskScheduler()

    # 创建多个任务
    task1 = await scheduler.add_task(
        db=db_session,
        team_id=test_team.id,
        title="Low Priority",
        description="Low priority task",
        priority=1
    )

    task2 = await scheduler.add_task(
        db=db_session,
        team_id=test_team.id,
        title="High Priority",
        description="High priority task",
        priority=10
    )

    # 获取下一个任务（应该是高优先级的）
    next_task = await scheduler.get_next_task(db=db_session, agent_id=1)

    assert next_task is not None
    assert next_task.id == task2.id
    assert next_task.assigned_to == 1
    assert next_task.status == "in_progress"


@pytest.mark.asyncio
async def test_complete_task(db_session: AsyncSession, test_team: AgentTeam):
    """测试完成任务"""
    scheduler = TaskScheduler()

    task = await scheduler.add_task(
        db=db_session,
        team_id=test_team.id,
        title="Task to Complete",
        description="This task will be completed",
        priority=1
    )

    # 获取任务
    next_task = await scheduler.get_next_task(db=db_session, agent_id=1)
    assert next_task.id == task.id

    # 完成任务
    completed_task = await scheduler.complete_task(db=db_session, task_id=task.id)

    assert completed_task is not None
    assert completed_task.status == "completed"
    assert completed_task.completed_at is not None


@pytest.mark.asyncio
async def test_complete_task_unlocks_dependent_tasks(db_session: AsyncSession, test_team: AgentTeam):
    """测试完成任务后解锁依赖任务"""
    scheduler = TaskScheduler()

    # 创建任务链
    task1 = await scheduler.add_task(
        db=db_session,
        team_id=test_team.id,
        title="Task 1",
        description="First task",
        priority=1
    )

    task2 = await scheduler.add_task(
        db=db_session,
        team_id=test_team.id,
        title="Task 2",
        description="Second task (depends on Task 1)",
        priority=1,
        dependencies=[task1.id]
    )

    # 获取并完成 task1
    next_task = await scheduler.get_next_task(db=db_session, agent_id=1)
    assert next_task.id == task1.id

    await scheduler.complete_task(db=db_session, task_id=task1.id)

    # 现在 task2 应该可以被获取
    next_task = await scheduler.get_next_task(db=db_session, agent_id=2)
    assert next_task is not None
    assert next_task.id == task2.id


@pytest.mark.asyncio
async def test_fail_task(db_session: AsyncSession, test_team: AgentTeam):
    """测试标记任务失败"""
    scheduler = TaskScheduler()

    task = await scheduler.add_task(
        db=db_session,
        team_id=test_team.id,
        title="Task to Fail",
        description="This task will fail",
        priority=1
    )

    # 获取任务
    next_task = await scheduler.get_next_task(db=db_session, agent_id=1)

    # 标记失败
    failed_task = await scheduler.fail_task(
        db=db_session,
        task_id=task.id,
        error_message="Test error"
    )

    assert failed_task is not None
    assert failed_task.status == "failed"
    assert "Test error" in failed_task.description


@pytest.mark.asyncio
async def test_get_team_tasks(db_session: AsyncSession, test_team: AgentTeam):
    """测试获取团队任务"""
    scheduler = TaskScheduler()

    # 创建多个任务
    await scheduler.add_task(
        db=db_session,
        team_id=test_team.id,
        title="Task 1",
        description="First task",
        priority=1
    )

    await scheduler.add_task(
        db=db_session,
        team_id=test_team.id,
        title="Task 2",
        description="Second task",
        priority=2
    )

    # 获取所有任务
    tasks = await scheduler.get_team_tasks(db=db_session, team_id=test_team.id)

    assert len(tasks) == 2

    # 按状态过滤
    pending_tasks = await scheduler.get_team_tasks(
        db=db_session,
        team_id=test_team.id,
        status="pending"
    )

    assert len(pending_tasks) == 2


@pytest.mark.asyncio
async def test_get_agent_tasks(db_session: AsyncSession, test_team: AgentTeam):
    """测试获取 agent 的任务"""
    scheduler = TaskScheduler()

    # 创建任务
    await scheduler.add_task(
        db=db_session,
        team_id=test_team.id,
        title="Task 1",
        description="First task",
        priority=1
    )

    # 分配给 agent
    task = await scheduler.get_next_task(db=db_session, agent_id=1)

    # 获取 agent 的任务
    agent_tasks = await scheduler.get_agent_tasks(db=db_session, agent_id=1)

    assert len(agent_tasks) == 1
    assert agent_tasks[0].id == task.id

"""
Agent 测试服务单元测试
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime

from app.services.agent_test_service import AgentTestService
from app.models.task import ExecutionStatus, ExecutionType, Execution, Task


@pytest.mark.asyncio
async def test_create_agent_test_execution():
    """测试创建 Agent 测试执行记录"""
    # Mock 数据库会话
    db = AsyncMock()
    db.flush = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    service = AgentTestService(db)

    execution = await service.create_agent_test_execution(
        agent_id=1,
        test_input="测试输入"
    )

    # 验证执行记录属性
    assert execution.execution_type == ExecutionType.AGENT_TEST
    assert execution.agent_id == 1
    assert execution.test_input == "测试输入"
    assert execution.status == ExecutionStatus.PENDING
    assert execution.workflow_id is None

    # 验证数据库操作
    db.add.assert_called()
    db.commit.assert_called_once()


@pytest.mark.asyncio
async def test_execute_agent_test_success():
    """测试 Agent 测试执行成功"""
    # Mock 数据库会话
    db = AsyncMock()
    mock_result = MagicMock()
    mock_execution = Execution(
        id=1,
        task_id=1,
        workflow_id=None,
        execution_type=ExecutionType.AGENT_TEST,
        agent_id=1,
        test_input="测试输入",
        status=ExecutionStatus.PENDING,
        created_at=datetime.utcnow()
    )
    mock_result.scalar_one.return_value = mock_execution
    db.execute = AsyncMock(return_value=mock_result)
    db.commit = AsyncMock()

    # Mock WebSocket 管理器
    manager = AsyncMock()
    manager.broadcast_execution_update = AsyncMock()

    service = AgentTestService(db)

    # Mock ClaudeAdapter
    with patch('app.services.agent_test_service.ClaudeAdapter') as mock_adapter_class:
        mock_adapter = AsyncMock()
        mock_adapter.execute_with_agent = AsyncMock(return_value={
            "success": True,
            "output": "测试输出",
            "error": None
        })
        mock_adapter_class.return_value = mock_adapter

        await service.execute_agent_test(1, manager)

        # 验证状态更新广播至少被调用 2 次（RUNNING + SUCCEEDED）
        assert manager.broadcast_execution_update.call_count >= 2

        # 验证最终状态为 SUCCEEDED
        assert mock_execution.status == ExecutionStatus.SUCCEEDED
        assert mock_execution.test_output == "测试输出"
        assert mock_execution.finished_at is not None


@pytest.mark.asyncio
async def test_execute_agent_test_failure():
    """测试 Agent 测试执行失败"""
    # Mock 数据库会话
    db = AsyncMock()
    mock_result = MagicMock()
    mock_execution = Execution(
        id=1,
        task_id=1,
        workflow_id=None,
        execution_type=ExecutionType.AGENT_TEST,
        agent_id=1,
        test_input="测试输入",
        status=ExecutionStatus.PENDING,
        created_at=datetime.utcnow()
    )
    mock_result.scalar_one.return_value = mock_execution
    db.execute = AsyncMock(return_value=mock_result)
    db.commit = AsyncMock()

    # Mock WebSocket 管理器
    manager = AsyncMock()
    manager.broadcast_execution_update = AsyncMock()

    service = AgentTestService(db)

    # Mock ClaudeAdapter 抛出异常
    with patch('app.services.agent_test_service.ClaudeAdapter') as mock_adapter_class:
        mock_adapter = AsyncMock()
        mock_adapter.execute_with_agent = AsyncMock(side_effect=Exception("执行失败"))
        mock_adapter_class.return_value = mock_adapter

        await service.execute_agent_test(1, manager)

        # 验证最终状态为 FAILED
        assert mock_execution.status == ExecutionStatus.FAILED
        assert mock_execution.error_message == "执行失败"
        assert mock_execution.finished_at is not None

        # 验证失败状态被广播
        assert manager.broadcast_execution_update.call_count >= 2

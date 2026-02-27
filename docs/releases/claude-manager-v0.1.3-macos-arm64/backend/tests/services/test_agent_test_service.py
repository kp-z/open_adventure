"""
Agent 测试服务单元测试
"""
import pytest
from unittest.mock import AsyncMock, MagicMock
from app.services.agent_test_service import AgentTestService
from app.models.task import ExecutionStatus, ExecutionType

@pytest.mark.asyncio
async def test_create_agent_test_execution():
    """测试创建 Agent 测试执行记录"""
    db = AsyncMock()
    service = AgentTestService(db)
    
    # Mock flush and commit
    db.flush = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    
    execution = await service.create_agent_test_execution(
        agent_id=1,
        test_input="测试输入"
    )
    
    assert execution.execution_type == ExecutionType.AGENT_TEST
    assert execution.agent_id == 1
    assert execution.test_input == "测试输入"
    assert execution.status == ExecutionStatus.PENDING

"""
Microverse API 单元测试
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException
from datetime import datetime

from app.services.microverse_agent_service import MicroverseAgentService
from app.models.task import ExecutionStatus, ExecutionType
from app.models.microverse import MicroverseCharacter


@pytest.mark.asyncio
async def test_create_conversation():
    """测试创建对话会话"""
    db = AsyncMock()
    service = MicroverseAgentService(db)

    # Mock character
    character = MicroverseCharacter(
        id=1,
        character_name="test_character",
        display_name="Test Character",
        agent_id=1,
        is_working=False
    )

    # Mock database operations
    db.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=character)))
    db.add = MagicMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    result = await service.create_conversation(
        character_name="test_character",
        context={"key": "value"}
    )

    assert "session_id" in result
    assert result["character_name"] == "test_character"
    assert result["agent_id"] == 1
    assert "created_at" in result
    assert "last_activity_at" in result


@pytest.mark.asyncio
async def test_create_conversation_no_agent():
    """测试创建对话会话时角色未绑定 Agent"""
    db = AsyncMock()
    service = MicroverseAgentService(db)

    # Mock character without agent
    character = MicroverseCharacter(
        id=1,
        character_name="test_character",
        display_name="Test Character",
        agent_id=None,
        is_working=False
    )

    db.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=character)))

    with pytest.raises(HTTPException) as exc_info:
        await service.create_conversation(
            character_name="test_character"
        )

    assert exc_info.value.status_code == 400
    assert "not bound to any agent" in str(exc_info.value.detail)


@pytest.mark.asyncio
async def test_send_message():
    """测试发送消息"""
    db = AsyncMock()
    service = MicroverseAgentService(db)

    # Mock execution with chat history
    execution = MagicMock()
    execution.session_id = "test-session-id"
    execution.agent_id = 1
    execution.chat_history = "[]"

    # Mock agent
    agent = MagicMock()
    agent.id = 1
    agent.name = "test_agent"

    # Mock database operations
    db.execute = AsyncMock(side_effect=[
        MagicMock(scalar_one_or_none=MagicMock(return_value=execution)),
        MagicMock(scalar_one_or_none=MagicMock(return_value=agent))
    ])
    db.commit = AsyncMock()

    # Mock AI API call
    with patch.object(service, '_call_ai_api', return_value="Test response"):
        result = await service.send_message(
            session_id="test-session-id",
            message="Hello",
            context=None
        )

    assert result["role"] == "assistant"
    assert result["content"] == "Test response"
    assert "message_id" in result
    assert "timestamp" in result


@pytest.mark.asyncio
async def test_get_conversation_history():
    """测试获取对话历史"""
    db = AsyncMock()
    service = MicroverseAgentService(db)

    # Mock execution with chat history
    import json
    chat_history = [
        {
            "message_id": "msg-1",
            "role": "user",
            "content": "Hello",
            "timestamp": "2024-01-01T00:00:00"
        },
        {
            "message_id": "msg-2",
            "role": "assistant",
            "content": "Hi there!",
            "timestamp": "2024-01-01T00:00:01"
        }
    ]

    execution = MagicMock()
    execution.session_id = "test-session-id"
    execution.chat_history = json.dumps(chat_history)

    db.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=execution)))

    result = await service.get_conversation_history(
        session_id="test-session-id",
        offset=0,
        limit=50
    )

    assert result["session_id"] == "test-session-id"
    assert len(result["messages"]) == 2
    assert result["total"] == 2
    assert result["messages"][0]["role"] == "user"
    assert result["messages"][1]["role"] == "assistant"


@pytest.mark.asyncio
async def test_get_conversation_history_pagination():
    """测试对话历史分页"""
    db = AsyncMock()
    service = MicroverseAgentService(db)

    # Mock execution with multiple messages
    import json
    chat_history = [
        {"message_id": f"msg-{i}", "role": "user", "content": f"Message {i}", "timestamp": "2024-01-01T00:00:00"}
        for i in range(10)
    ]

    execution = MagicMock()
    execution.session_id = "test-session-id"
    execution.chat_history = json.dumps(chat_history)

    db.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=execution)))

    # Test pagination
    result = await service.get_conversation_history(
        session_id="test-session-id",
        offset=0,
        limit=5
    )

    assert len(result["messages"]) == 5
    assert result["total"] == 10
    assert result["messages"][0]["message_id"] == "msg-0"
    assert result["messages"][4]["message_id"] == "msg-4"

    # Test second page
    result = await service.get_conversation_history(
        session_id="test-session-id",
        offset=5,
        limit=5
    )

    assert len(result["messages"]) == 5
    assert result["total"] == 10
    assert result["messages"][0]["message_id"] == "msg-5"
    assert result["messages"][4]["message_id"] == "msg-9"


@pytest.mark.asyncio
async def test_send_message_session_not_found():
    """测试发送消息时会话不存在"""
    db = AsyncMock()
    service = MicroverseAgentService(db)

    db.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=None)))

    with pytest.raises(HTTPException) as exc_info:
        await service.send_message(
            session_id="non-existent-session",
            message="Hello"
        )

    assert exc_info.value.status_code == 404
    assert "Session" in str(exc_info.value.detail)

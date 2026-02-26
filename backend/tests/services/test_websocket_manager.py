# backend/tests/services/test_websocket_manager.py
import pytest
from unittest.mock import AsyncMock, MagicMock
from app.services.websocket_manager import ConnectionManager

@pytest.mark.asyncio
async def test_connect_websocket():
    """测试 WebSocket 连接"""
    manager = ConnectionManager()
    websocket = AsyncMock()

    await manager.connect("client-1", websocket)

    websocket.accept.assert_called_once()
    assert "client-1" in manager.active_connections

@pytest.mark.asyncio
async def test_disconnect_websocket():
    """测试 WebSocket 断开"""
    manager = ConnectionManager()
    websocket = AsyncMock()

    await manager.connect("client-1", websocket)
    manager.disconnect("client-1")

    assert "client-1" not in manager.active_connections

@pytest.mark.asyncio
async def test_broadcast_execution_update():
    """测试广播执行更新"""
    manager = ConnectionManager()
    ws1 = AsyncMock()
    ws2 = AsyncMock()

    await manager.connect("client-1", ws1)
    await manager.connect("client-2", ws2)

    await manager.broadcast_execution_update({
        "id": 1,
        "status": "running"
    })

    ws1.send_json.assert_called_once()
    ws2.send_json.assert_called_once()

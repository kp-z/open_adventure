"""
WebSocket API 路由
提供实时执行状态更新的 WebSocket 端点
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends
from app.services.websocket_manager import ConnectionManager, get_connection_manager
import logging

logger = logging.getLogger(__name__)
router = APIRouter(tags=["websocket"])

@router.websocket("/ws/executions")
async def websocket_executions(
    websocket: WebSocket,
    client_id: str = Query(..., description="客户端唯一标识"),
    manager: ConnectionManager = Depends(get_connection_manager)
):
    """
    WebSocket 端点：实时执行状态更新

    客户端连接后会接收所有执行状态变化的广播消息

    消息格式：
    {
        "type": "execution_update",
        "data": {
            "id": 123,
            "status": "running",
            "execution_type": "agent_test",
            ...
        }
    }
    """
    await manager.connect(client_id, websocket)

    try:
        while True:
            # 接收心跳消息保持连接
            data = await websocket.receive_text()
            logger.debug(f"Received heartbeat from {client_id}: {data}")

            # 可选：响应心跳
            if data == "ping":
                await websocket.send_text("pong")

    except WebSocketDisconnect:
        manager.disconnect(client_id)
        logger.info(f"Client {client_id} disconnected")
    except Exception as e:
        logger.error(f"WebSocket error for {client_id}: {e}")
        manager.disconnect(client_id)

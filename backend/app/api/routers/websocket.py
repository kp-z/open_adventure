"""
WebSocket API 路由
提供实时执行状态更新的 WebSocket 端点
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends
from app.services.websocket_manager import ConnectionManager, get_connection_manager
import logging

logger = logging.getLogger(__name__)
router = APIRouter(tags=["websocket"])

@router.get("/stats")
async def get_websocket_stats(
    manager: ConnectionManager = Depends(get_connection_manager)
):
    """
    获取 WebSocket 连接统计信息

    返回：
    - total_connections: 当前活跃连接数
    - max_connections: 最大连接数限制
    - connection_timeout: 连接超时时间（秒）
    - cleanup_interval: 清理间隔（秒）
    - connections: 连接详情列表
    """
    from datetime import datetime

    connections = []
    now = datetime.now()

    for client_id, timestamp in manager.connection_timestamps.items():
        age_seconds = (now - timestamp).total_seconds()
        connections.append({
            "client_id": client_id,
            "connected_at": timestamp.isoformat(),
            "age_seconds": int(age_seconds),
            "is_active": client_id in manager.active_connections
        })

    return {
        "total_connections": len(manager.active_connections),
        "max_connections": manager.MAX_CONNECTIONS,
        "connection_timeout": manager.CONNECTION_TIMEOUT,
        "cleanup_interval": manager.CLEANUP_INTERVAL,
        "connections": connections
    }

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

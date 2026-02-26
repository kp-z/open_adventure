"""
WebSocket 连接管理器
负责管理所有活跃的 WebSocket 连接并广播消息
"""
from typing import Dict
from fastapi import WebSocket
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    """WebSocket 连接管理器"""

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, client_id: str, websocket: WebSocket):
        """
        接受并存储 WebSocket 连接

        Args:
            client_id: 客户端唯一标识
            websocket: WebSocket 连接对象
        """
        await websocket.accept()
        self.active_connections[client_id] = websocket
        logger.info(f"WebSocket connected: {client_id}, total connections: {len(self.active_connections)}")

    def disconnect(self, client_id: str):
        """
        移除 WebSocket 连接

        Args:
            client_id: 客户端唯一标识
        """
        self.active_connections.pop(client_id, None)
        logger.info(f"WebSocket disconnected: {client_id}, total connections: {len(self.active_connections)}")

    async def broadcast_execution_update(self, execution_data: dict):
        """
        广播执行状态更新到所有连接的客户端

        Args:
            execution_data: 执行数据字典
        """
        message = {
            "type": "execution_update",
            "data": execution_data
        }

        # 广播到所有活跃连接
        disconnected_clients = []
        for client_id, connection in self.active_connections.items():
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Failed to send message to {client_id}: {e}")
                disconnected_clients.append(client_id)

        # 清理断开的连接
        for client_id in disconnected_clients:
            self.disconnect(client_id)

        logger.debug(f"Broadcasted execution update to {len(self.active_connections)} clients")

# 全局单例
_connection_manager = None

def get_connection_manager() -> ConnectionManager:
    """获取全局 ConnectionManager 实例"""
    global _connection_manager
    if _connection_manager is None:
        _connection_manager = ConnectionManager()
    return _connection_manager

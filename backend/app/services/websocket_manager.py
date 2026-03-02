"""
WebSocket 连接管理器
负责管理所有活跃的 WebSocket 连接并广播消息
"""
from typing import Dict
from fastapi import WebSocket
import logging
import asyncio
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class ConnectionManager:
    """WebSocket 连接管理器"""

    # 配置参数
    MAX_CONNECTIONS = 100  # 最大连接数
    CONNECTION_TIMEOUT = 3600  # 连接超时时间（秒），1小时
    CLEANUP_INTERVAL = 300  # 清理间隔（秒），5分钟

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.connection_timestamps: Dict[str, datetime] = {}  # 记录连接创建时间
        self._cleanup_task = None  # 清理任务

    async def connect(self, client_id: str, websocket: WebSocket):
        """
        接受并存储 WebSocket 连接

        Args:
            client_id: 客户端唯一标识
            websocket: WebSocket 连接对象
        """
        # 检查是否超过最大连接数
        if len(self.active_connections) >= self.MAX_CONNECTIONS:
            logger.warning(f"Max connections ({self.MAX_CONNECTIONS}) reached, rejecting new connection: {client_id}")
            await websocket.close(code=1008, reason="Server at maximum capacity")
            return

        await websocket.accept()
        self.active_connections[client_id] = websocket
        self.connection_timestamps[client_id] = datetime.now()

        # 启动清理任务（如果还没有启动）
        if self._cleanup_task is None:
            self._cleanup_task = asyncio.create_task(self._periodic_cleanup())

        logger.info(f"WebSocket connected: {client_id}, total connections: {len(self.active_connections)}")

    def disconnect(self, client_id: str):
        """
        移除 WebSocket 连接

        Args:
            client_id: 客户端唯一标识
        """
        self.active_connections.pop(client_id, None)
        self.connection_timestamps.pop(client_id, None)
        logger.info(f"WebSocket disconnected: {client_id}, total connections: {len(self.active_connections)}")

    async def _periodic_cleanup(self):
        """
        定期清理超时和断开的连接
        """
        logger.info("Starting periodic WebSocket cleanup task")
        try:
            while True:
                await asyncio.sleep(self.CLEANUP_INTERVAL)

                # 查找超时的连接
                now = datetime.now()
                timeout_threshold = now - timedelta(seconds=self.CONNECTION_TIMEOUT)

                disconnected_clients = []
                for client_id, timestamp in list(self.connection_timestamps.items()):
                    if timestamp < timeout_threshold:
                        logger.warning(f"Connection {client_id} timed out (created at {timestamp})")
                        disconnected_clients.append(client_id)
                    else:
                        # 检查连接是否仍然活跃
                        connection = self.active_connections.get(client_id)
                        if connection:
                            try:
                                # 发送 ping 消息测试连接
                                await connection.send_json({"type": "ping"})
                            except Exception as e:
                                logger.warning(f"Connection {client_id} is dead: {e}")
                                disconnected_clients.append(client_id)

                # 清理断开的连接
                for client_id in disconnected_clients:
                    connection = self.active_connections.get(client_id)
                    if connection:
                        try:
                            await connection.close()
                        except Exception:
                            pass
                    self.disconnect(client_id)

                if disconnected_clients:
                    logger.info(f"Cleaned up {len(disconnected_clients)} stale connections")

                # 记录当前连接状态
                logger.info(f"Active connections: {len(self.active_connections)}/{self.MAX_CONNECTIONS}")

        except asyncio.CancelledError:
            logger.info("Periodic cleanup task cancelled")
        except Exception as e:
            logger.error(f"Error in periodic cleanup: {e}")

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

    async def broadcast_terminal_execution_update(self, execution_data: dict):
        """
        广播 terminal 执行状态更新到所有连接的客户端

        Args:
            execution_data: 执行数据字典，包含 session_id 等信息
        """
        message = {
            "type": "terminal_execution_update",
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

        logger.debug(f"Broadcasted terminal execution update to {len(self.active_connections)} clients")

    async def shutdown(self):
        """
        关闭所有连接并停止清理任务
        """
        logger.info("Shutting down WebSocket manager...")

        # 停止清理任务
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass

        # 关闭所有活跃连接
        for client_id, connection in list(self.active_connections.items()):
            try:
                await connection.close()
            except Exception as e:
                logger.error(f"Error closing connection {client_id}: {e}")

        # 清空连接记录
        self.active_connections.clear()
        self.connection_timestamps.clear()

        logger.info(f"WebSocket manager shutdown complete. Closed {len(self.active_connections)} connections")

# 全局单例
_connection_manager = None

def get_connection_manager() -> ConnectionManager:
    """获取全局 ConnectionManager 实例"""
    global _connection_manager
    if _connection_manager is None:
        _connection_manager = ConnectionManager()
    return _connection_manager

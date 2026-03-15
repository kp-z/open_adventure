"""
Agent Monitor Service
监控 Agent 运行状态的后台服务
"""
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Set
from pathlib import Path
import psutil

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models.task import Execution, ExecutionStatus, ExecutionType
from app.core.logging import get_logger
from app.core.database import AsyncSessionLocal

logger = get_logger(__name__)


class AgentMonitorService:
    """Agent 心跳监控服务"""

    def __init__(self):
        self.monitoring_tasks: Dict[int, asyncio.Task] = {}
        self.running = False

    async def start(self):
        """启动监控服务"""
        if self.running:
            logger.warning("Monitor service is already running")
            return

        self.running = True
        logger.info("🚀 Agent Monitor Service started")

        # 启动全局监控任务
        asyncio.create_task(self._global_monitor_loop())

    async def stop(self):
        """停止监控服务"""
        self.running = False

        # 取消所有监控任务
        for task in self.monitoring_tasks.values():
            task.cancel()

        self.monitoring_tasks.clear()
        logger.info("🛑 Agent Monitor Service stopped")

    async def start_monitoring(self, execution_id: int):
        """
        启动对特定 Execution 的监控

        Args:
            execution_id: Execution ID
        """
        if execution_id in self.monitoring_tasks:
            logger.debug(f"Execution {execution_id} is already being monitored")
            return

        # 创建监控任务
        task = asyncio.create_task(self._monitor_execution(execution_id))
        self.monitoring_tasks[execution_id] = task

        logger.info(f"📊 Started monitoring execution {execution_id}")

    async def stop_monitoring(self, execution_id: int):
        """
        停止对特定 Execution 的监控

        Args:
            execution_id: Execution ID
        """
        if execution_id in self.monitoring_tasks:
            task = self.monitoring_tasks[execution_id]
            task.cancel()
            del self.monitoring_tasks[execution_id]
            logger.info(f"🛑 Stopped monitoring execution {execution_id}")

    async def _global_monitor_loop(self):
        """全局监控循环，检查所有运行中的 Execution"""
        while self.running:
            try:
                await asyncio.sleep(60)  # 每分钟检查一次

                async with AsyncSessionLocal() as db:
                    # 查询所有运行中的后台 Execution
                    result = await db.execute(
                        select(Execution).where(
                            and_(
                                Execution.status == ExecutionStatus.RUNNING,
                                Execution.execution_type == ExecutionType.AGENT_TEST,
                                Execution.is_background == True
                            )
                        )
                    )
                    executions = result.scalars().all()

                    logger.debug(f"Global monitor: found {len(executions)} running executions")

                    # 确保每个 Execution 都有监控任务
                    for execution in executions:
                        if execution.id not in self.monitoring_tasks:
                            await self.start_monitoring(execution.id)

                    # 清理已完成的监控任务
                    completed_ids = []
                    for execution_id, task in self.monitoring_tasks.items():
                        if task.done():
                            completed_ids.append(execution_id)

                    for execution_id in completed_ids:
                        del self.monitoring_tasks[execution_id]
                        logger.debug(f"Cleaned up completed monitoring task for execution {execution_id}")

            except Exception as e:
                logger.error(f"Error in global monitor loop: {e}")

    async def _monitor_execution(self, execution_id: int):
        """
        监控单个 Execution

        Args:
            execution_id: Execution ID
        """
        logger.info(f"🔍 Monitoring execution {execution_id}")

        try:
            while True:
                await asyncio.sleep(30)  # 每 30 秒检查一次

                async with AsyncSessionLocal() as db:
                    # 获取 Execution
                    result = await db.execute(
                        select(Execution).where(Execution.id == execution_id)
                    )
                    execution = result.scalar_one_or_none()

                    if not execution:
                        logger.warning(f"Execution {execution_id} not found, stopping monitor")
                        break

                    # 如果状态不是 RUNNING，停止监控
                    if execution.status != ExecutionStatus.RUNNING:
                        logger.info(f"Execution {execution_id} is no longer running (status={execution.status}), stopping monitor")
                        break

                    # 检查进程状态
                    if execution.process_pid:
                        process_status = await self._check_process_status(execution.process_pid)

                        if not process_status["is_running"]:
                            # 进程已停止
                            logger.warning(f"Process {execution.process_pid} for execution {execution_id} is not running")

                            # 检查日志文件最后修改时间
                            if execution.log_file and Path(execution.log_file).exists():
                                log_file = Path(execution.log_file)
                                last_modified = datetime.fromtimestamp(log_file.stat().st_mtime)

                                # 如果日志文件最近有更新，说明进程可能正常结束
                                if datetime.utcnow() - last_modified < timedelta(minutes=2):
                                    execution.status = ExecutionStatus.SUCCEEDED
                                    logger.info(f"Execution {execution_id} completed successfully")
                                else:
                                    execution.status = ExecutionStatus.FAILED
                                    execution.error_message = "Process stopped unexpectedly"
                                    logger.error(f"Execution {execution_id} failed: process stopped")
                            else:
                                execution.status = ExecutionStatus.FAILED
                                execution.error_message = "Process stopped unexpectedly"

                            execution.finished_at = datetime.utcnow()
                            await db.commit()
                            break

                        # 更新活动时间
                        if execution.log_file and Path(execution.log_file).exists():
                            log_file = Path(execution.log_file)
                            last_modified = datetime.fromtimestamp(log_file.stat().st_mtime)
                            execution.last_activity_at = last_modified

                        # 推送状态更新到 WebSocket
                        await self._broadcast_status_update(execution, process_status)

                        # 检查超时（10 分钟无活动）
                        if execution.last_activity_at:
                            inactive_duration = datetime.utcnow() - execution.last_activity_at
                            if inactive_duration > timedelta(minutes=10):
                                logger.warning(f"Execution {execution_id} timeout: no activity for {inactive_duration}")
                                execution.status = ExecutionStatus.FAILED
                                execution.error_message = f"Timeout: no activity for {inactive_duration}"
                                execution.finished_at = datetime.utcnow()

                                # 尝试终止进程
                                try:
                                    process = psutil.Process(execution.process_pid)
                                    process.terminate()
                                    await asyncio.sleep(5)
                                    if process.is_running():
                                        process.kill()
                                except psutil.NoSuchProcess:
                                    pass

                                await db.commit()
                                break

                        await db.commit()

        except asyncio.CancelledError:
            logger.info(f"Monitoring task for execution {execution_id} cancelled")
        except Exception as e:
            logger.error(f"Error monitoring execution {execution_id}: {e}")
            import traceback
            traceback.print_exc()

    async def _check_process_status(self, pid: int) -> Dict[str, any]:
        """
        检查进程状态

        Args:
            pid: 进程 ID

        Returns:
            Dict: 进程状态信息
        """
        try:
            process = psutil.Process(pid)
            return {
                "is_running": process.is_running(),
                "status": process.status(),
                "cpu_percent": process.cpu_percent(interval=0.1),
                "memory_mb": process.memory_info().rss / 1024 / 1024
            }
        except psutil.NoSuchProcess:
            return {
                "is_running": False,
                "status": "not_found",
                "cpu_percent": 0,
                "memory_mb": 0
            }

    async def _broadcast_status_update(self, execution: Execution, process_status: Dict):
        """
        广播状态更新到 WebSocket

        Args:
            execution: Execution 实例
            process_status: 进程状态信息
        """
        try:
            from app.services.websocket_manager import get_connection_manager
            manager = get_connection_manager()

            message = {
                "type": "agent_status_update",
                "execution_id": execution.id,
                "agent_id": execution.agent_id,
                "status": execution.status,
                "pid": execution.process_pid,
                "last_activity_at": execution.last_activity_at.isoformat() if execution.last_activity_at else None,
                "cpu_percent": process_status.get("cpu_percent", 0),
                "memory_mb": process_status.get("memory_mb", 0),
                "is_running": process_status.get("is_running", False)
            }

            # 广播给所有连接的客户端
            await manager.broadcast(message)

        except Exception as e:
            logger.error(f"Failed to broadcast status update: {e}")


# 全局单例
_monitor_service: AgentMonitorService = None


def get_monitor_service() -> AgentMonitorService:
    """获取监控服务单例"""
    global _monitor_service
    if _monitor_service is None:
        _monitor_service = AgentMonitorService()
    return _monitor_service

"""
Agent Process Manager - 统一的 Agent 进程管理器
管理 Agent 进程的生命周期，支持对话模式和 Terminal 模式
"""
import asyncio
import os
import pty
import select as select_module
import signal
import json
import re
from datetime import datetime
from typing import Dict, Optional, AsyncIterator, List
from dataclasses import dataclass, field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select as sql_select
import logging

from app.models.task import Execution, ExecutionStatus, ExecutionType, Task, TaskStatus

logger = logging.getLogger(__name__)


@dataclass
class ChatMessage:
    """聊天消息"""
    id: str
    role: str  # 'user' or 'agent'
    content: str
    timestamp: str
    status: str = 'success'  # 'success', 'error', 'sending'


@dataclass
class ProcessInfo:
    """进程信息"""
    agent_id: int
    session_id: str
    pid: int
    master_fd: int  # PTY master file descriptor
    created_at: datetime
    last_activity_at: datetime
    chat_history: List[ChatMessage] = field(default_factory=list)
    raw_output: str = ""  # 原始终端输出
    is_new: bool = True  # 是否是新创建的进程
    execution_id: Optional[int] = None  # 关联的 Execution ID


class AgentProcessManager:
    """统一的 Agent 进程管理器"""

    def __init__(self):
        # 进程池：{agent_id: ProcessInfo}
        self._processes: Dict[int, ProcessInfo] = {}
        self._lock = asyncio.Lock()

    async def get_or_create_process(
        self,
        agent_id: int,
        agent_name: str,
        db: AsyncSession,
        session_id: Optional[str] = None
    ) -> ProcessInfo:
        """
        获取或创建 Agent 进程（PTY）

        Args:
            agent_id: Agent ID
            agent_name: Agent 名称
            db: 数据库会话
            session_id: 可选的会话 ID（用于恢复现有会话）

        Returns:
            ProcessInfo: 进程信息
        """
        async with self._lock:
            # 如果指定了 session_id，尝试恢复现有会话
            if session_id:
                execution = await self._get_execution_by_session(db, session_id)
                if execution and execution.terminal_pid:
                    # 检查进程是否仍然存活
                    if self._is_process_alive(execution.terminal_pid):
                        # 从数据库恢复进程信息
                        process_info = await self._restore_process_from_db(execution)
                        self._processes[agent_id] = process_info
                        logger.info(f"Restored existing process for agent {agent_id}, session {session_id}")
                        return process_info
                    else:
                        # 进程已死，标记会话为 CANCELLED
                        execution.status = ExecutionStatus.CANCELLED
                        execution.finished_at = datetime.utcnow()
                        await db.commit()
                        logger.warning(f"Process {execution.terminal_pid} is dead, marked session as CANCELLED")

            # 检查是否已有活跃进程
            if agent_id in self._processes:
                process_info = self._processes[agent_id]
                if self._is_process_alive(process_info.pid):
                    process_info.is_new = False
                    process_info.last_activity_at = datetime.utcnow()
                    logger.info(f"Reusing existing process for agent {agent_id}")
                    return process_info
                else:
                    # 进程已死，清理
                    logger.warning(f"Process {process_info.pid} is dead, cleaning up")
                    await self._cleanup_process(agent_id, db)

            # 创建新进程
            process_info = await self._create_new_process(agent_id, agent_name, db)
            self._processes[agent_id] = process_info
            logger.info(f"Created new process for agent {agent_id}, PID: {process_info.pid}")
            return process_info

    async def stop_process(self, agent_id: int, db: AsyncSession) -> bool:
        """
        停止 Agent 进程

        Args:
            agent_id: Agent ID
            db: 数据库会话

        Returns:
            bool: 是否成功停止
        """
        async with self._lock:
            if agent_id not in self._processes:
                logger.warning(f"No process found for agent {agent_id}")
                return False

            process_info = self._processes[agent_id]

            # 终止进程
            try:
                os.kill(process_info.pid, signal.SIGTERM)
                # 等待进程结束
                await asyncio.sleep(0.5)
                if self._is_process_alive(process_info.pid):
                    os.kill(process_info.pid, signal.SIGKILL)
                logger.info(f"Stopped process {process_info.pid} for agent {agent_id}")
            except ProcessLookupError:
                logger.warning(f"Process {process_info.pid} already dead")

            # 关闭 PTY
            try:
                os.close(process_info.master_fd)
            except OSError:
                pass

            # 更新数据库
            await self._cleanup_process(agent_id, db)

            # 从进程池移除
            del self._processes[agent_id]
            return True

    async def restart_process(
        self,
        agent_id: int,
        agent_name: str,
        db: AsyncSession
    ) -> ProcessInfo:
        """
        重启 Agent 进程

        Args:
            agent_id: Agent ID
            agent_name: Agent 名称
            db: 数据库会话

        Returns:
            ProcessInfo: 新的进程信息
        """
        # 先停止现有进程
        await self.stop_process(agent_id, db)

        # 创建新进程
        return await self.get_or_create_process(agent_id, agent_name, db)

    async def send_to_process(self, agent_id: int, message: str, db: AsyncSession):
        """
        发送消息到 Agent 进程

        Args:
            agent_id: Agent ID
            message: 消息内容
            db: 数据库会话
        """
        if agent_id not in self._processes:
            raise ValueError(f"No process found for agent {agent_id}")

        process_info = self._processes[agent_id]

        # 发送消息到 PTY
        try:
            os.write(process_info.master_fd, (message + '\n').encode())
            process_info.last_activity_at = datetime.utcnow()

            # 更新数据库
            await self._update_activity(process_info, db)

            logger.info(f"Sent message to agent {agent_id}: {message[:50]}...")
        except OSError as e:
            logger.error(f"Failed to send message to agent {agent_id}: {e}")
            raise

    async def read_from_process(self, agent_id: int, db: AsyncSession) -> AsyncIterator[str]:
        """
        从 Agent 进程读取输出（流式）

        Args:
            agent_id: Agent ID
            db: 数据库会话

        Yields:
            str: 输出内容
        """
        if agent_id not in self._processes:
            raise ValueError(f"No process found for agent {agent_id}")

        process_info = self._processes[agent_id]

        # 设置非阻塞模式
        import fcntl
        flags = fcntl.fcntl(process_info.master_fd, fcntl.F_GETFL)
        fcntl.fcntl(process_info.master_fd, fcntl.F_SETFL, flags | os.O_NONBLOCK)

        while True:
            try:
                # 尝试读取数据（非阻塞）
                try:
                    data = os.read(process_info.master_fd, 4096)
                    if not data:
                        # EOF，进程已结束
                        logger.info(f"Process {process_info.pid} ended")
                        break

                    output = data.decode('utf-8', errors='replace')
                    process_info.raw_output += output
                    process_info.last_activity_at = datetime.utcnow()

                    # 更新数据库
                    await self._update_activity(process_info, db)

                    yield output
                except BlockingIOError:
                    # 没有数据可读，短暂等待
                    await asyncio.sleep(0.1)

            except OSError as e:
                logger.error(f"Error reading from process {process_info.pid}: {e}")
                break

    def parse_chat_message(self, output: str) -> Optional[ChatMessage]:
        """
        解析输出为聊天消息

        Args:
            output: 原始输出

        Returns:
            Optional[ChatMessage]: 解析后的消息，如果无法解析则返回 None
        """
        # 简单的解析逻辑：检测是否包含 Agent 回复的标记
        # 实际实现可能需要更复杂的解析逻辑

        # 移除 ANSI 控制码
        ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
        clean_output = ansi_escape.sub('', output)

        # 检测是否是 Agent 回复
        if clean_output.strip():
            return ChatMessage(
                id=f"agent-{datetime.utcnow().timestamp()}",
                role='agent',
                content=clean_output,
                timestamp=datetime.utcnow().isoformat(),
                status='success'
            )

        return None

    async def get_process_status(self, agent_id: int) -> Optional[Dict]:
        """
        获取进程状态

        Args:
            agent_id: Agent ID

        Returns:
            Optional[Dict]: 进程状态信息
        """
        if agent_id not in self._processes:
            return None

        process_info = self._processes[agent_id]

        return {
            'agent_id': agent_id,
            'session_id': process_info.session_id,
            'pid': process_info.pid,
            'is_alive': self._is_process_alive(process_info.pid),
            'created_at': process_info.created_at.isoformat(),
            'last_activity_at': process_info.last_activity_at.isoformat(),
            'chat_history_count': len(process_info.chat_history),
            'raw_output_size': len(process_info.raw_output)
        }

    # ========== 私有方法 ==========

    async def _create_new_process(
        self,
        agent_id: int,
        agent_name: str,
        db: AsyncSession
    ) -> ProcessInfo:
        """创建新的 Agent 进程"""
        import uuid

        session_id = str(uuid.uuid4())

        # 创建 PTY
        master_fd, slave_fd = pty.openpty()

        # Fork 进程
        pid = os.fork()

        if pid == 0:
            # 子进程
            os.close(master_fd)

            # 设置 PTY 为标准输入输出
            os.dup2(slave_fd, 0)
            os.dup2(slave_fd, 1)
            os.dup2(slave_fd, 2)

            if slave_fd > 2:
                os.close(slave_fd)

            # 执行 claude CLI 启动 Agent 会话
            # 使用 claude 命令启动指定的 Agent
            os.execvp('claude', [
                'claude',
                '--agent', agent_name,
                '--output-format', 'text',
                '--disable-slash-commands'
            ])
        else:
            # 父进程
            os.close(slave_fd)

            # 创建 ProcessInfo
            process_info = ProcessInfo(
                agent_id=agent_id,
                session_id=session_id,
                pid=pid,
                master_fd=master_fd,
                created_at=datetime.utcnow(),
                last_activity_at=datetime.utcnow(),
                is_new=True
            )

            # 保存到数据库
            await self._save_process_to_db(process_info, agent_name, db)

            return process_info

    async def _save_process_to_db(
        self,
        process_info: ProcessInfo,
        agent_name: str,
        db: AsyncSession
    ):
        """保存进程信息到数据库"""
        # 创建一个虚拟 Task
        task = Task(
            title=f"Agent Session - {agent_name}",
            description=f"Agent session for {agent_name}",
            status=TaskStatus.RUNNING
        )
        db.add(task)
        await db.flush()

        # 创建 Execution
        execution = Execution(
            task_id=task.id,
            workflow_id=1,  # 虚拟 workflow_id
            execution_type=ExecutionType.AGENT_TEST,
            agent_id=process_info.agent_id,
            status=ExecutionStatus.RUNNING,
            session_id=process_info.session_id,
            last_activity_at=process_info.last_activity_at,
            is_background=True,
            started_at=process_info.created_at,
            terminal_pid=process_info.pid,
            chat_history=json.dumps([]),
            terminal_output=""
        )

        db.add(execution)
        await db.commit()
        await db.refresh(execution)

        process_info.execution_id = execution.id
        logger.info(f"Saved process to database: execution_id={execution.id}")

    async def _update_activity(self, process_info: ProcessInfo, db: AsyncSession):
        """更新进程活动时间"""
        if not process_info.execution_id:
            return

        stmt = sql_select(Execution).where(Execution.id == process_info.execution_id)
        result = await db.execute(stmt)
        execution = result.scalar_one_or_none()

        if execution:
            execution.last_activity_at = process_info.last_activity_at
            execution.terminal_output = process_info.raw_output[-10000:]  # 限制大小
            execution.chat_history = json.dumps([
                {
                    'id': msg.id,
                    'role': msg.role,
                    'content': msg.content,
                    'timestamp': msg.timestamp,
                    'status': msg.status
                }
                for msg in process_info.chat_history
            ])
            await db.commit()

    async def _cleanup_process(self, agent_id: int, db: AsyncSession):
        """清理进程信息"""
        if agent_id not in self._processes:
            return

        process_info = self._processes[agent_id]

        if process_info.execution_id:
            stmt = sql_select(Execution).where(Execution.id == process_info.execution_id)
            result = await db.execute(stmt)
            execution = result.scalar_one_or_none()

            if execution:
                execution.status = ExecutionStatus.CANCELLED
                execution.finished_at = datetime.utcnow()
                await db.commit()

    async def _get_execution_by_session(
        self,
        db: AsyncSession,
        session_id: str
    ) -> Optional[Execution]:
        """根据 session_id 获取 Execution"""
        stmt = sql_select(Execution).where(Execution.session_id == session_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def _restore_process_from_db(self, execution: Execution) -> ProcessInfo:
        """从数据库恢复进程信息"""
        # 解析聊天历史
        chat_history = []
        if execution.chat_history:
            try:
                history_data = json.loads(execution.chat_history)
                chat_history = [
                    ChatMessage(**msg) for msg in history_data
                ]
            except (json.JSONDecodeError, TypeError):
                logger.warning(f"Failed to parse chat history for execution {execution.id}")

        # 重新打开 PTY（这里简化处理，实际可能需要更复杂的逻辑）
        # 注意：实际上无法直接恢复 PTY，这里只是示例
        # 真实场景可能需要重新创建进程或使用其他机制

        process_info = ProcessInfo(
            agent_id=execution.agent_id,
            session_id=execution.session_id,
            pid=execution.terminal_pid,
            master_fd=-1,  # 无法恢复 master_fd
            created_at=execution.started_at or datetime.utcnow(),
            last_activity_at=execution.last_activity_at or datetime.utcnow(),
            chat_history=chat_history,
            raw_output=execution.terminal_output or "",
            is_new=False,
            execution_id=execution.id
        )

        return process_info

    def _is_process_alive(self, pid: int) -> bool:
        """检查进程是否存活"""
        try:
            os.kill(pid, 0)
            return True
        except (ProcessLookupError, PermissionError):
            return False


# 全局单例
_process_manager: Optional[AgentProcessManager] = None


def get_process_manager() -> AgentProcessManager:
    """获取全局进程管理器实例"""
    global _process_manager
    if _process_manager is None:
        _process_manager = AgentProcessManager()
    return _process_manager

"""
Terminal WebSocket endpoint for executing shell commands
"""
import asyncio
import os
import pty
import select
import struct
import fcntl
import termios
import uuid
import logging
import json
from pathlib import Path
from typing import Dict, Optional, List, Any
from datetime import datetime, timedelta

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import select as sql_select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db, AsyncSessionLocal
from app.repositories.project_path_repository import ProjectPathRepository
from app.services.project_path_service import ProjectPathService
from app.repositories.executions_repo import ExecutionRepository
from app.repositories.task_repository import TaskRepository
from app.models.task import Execution, ExecutionType, ExecutionStatus, TaskStatus
from app.services.websocket_manager import get_connection_manager

router = APIRouter()
logger = logging.getLogger(__name__)


class TerminalSession:
    """Manages a PTY terminal session"""

    def __init__(self, session_id: str, initial_dir: Optional[str] = None, auto_start_claude: bool = False, claude_resume_session: Optional[str] = None):
        self.session_id = session_id
        self.master_fd = None
        self.pid = None
        self.running = False
        self.last_activity = datetime.now()
        self.created_at = datetime.now()
        self.initial_dir = initial_dir
        self.auto_start_claude = auto_start_claude
        self.claude_resume_session = claude_resume_session  # Claude 会话恢复的 session ID
        self.websocket = None  # 当前连接的 WebSocket
        self.execution_id = None  # 关联的 execution ID
        self.claude_running = False  # 标记是否运行了 claude code
        self.scrollback_buffer = []  # 保存终端输出历史（原始字节流，包含 ANSI 序列）
        self.max_scrollback_bytes = 1024 * 1024  # 最大保存 1MB
        self.current_scrollback_size = 0  # 当前 scrollback 大小（字节）
        self.terminal_rows = 24  # 终端行数
        self.terminal_cols = 80  # 终端列数
        self.waiting_for_restore_ready = False  # 是否等待前端 restore_ready 信号
        self.restore_ready_timeout = None  # 超时兜底任务

    def is_process_alive(self) -> bool:
        """检查 PTY 进程是否还在运行"""
        if not self.pid:
            return False
        try:
            # 发送信号 0 检查进程是否存在
            os.kill(self.pid, 0)
            return True
        except (OSError, ProcessLookupError):
            return False

    def check_claude_running(self) -> bool:
        """检查是否有 claude 进程在运行"""
        if not self.pid:
            print(f"[Terminal] check_claude_running: No PID")
            return False
        try:
            # 查找 shell 进程的所有子进程
            import subprocess
            result = subprocess.run(
                ['pgrep', '-P', str(self.pid)],
                capture_output=True,
                text=True
            )
            print(f"[Terminal] pgrep result: returncode={result.returncode}, stdout={result.stdout}")

            if result.returncode == 0:
                child_pids = result.stdout.strip().split('\n')
                print(f"[Terminal] Found child PIDs: {child_pids}")

                # 检查每个子进程的命令
                for child_pid in child_pids:
                    if child_pid:
                        try:
                            cmd_result = subprocess.run(
                                ['ps', '-p', child_pid, '-o', 'comm='],
                                capture_output=True,
                                text=True
                            )
                            print(f"[Terminal] PID {child_pid} command: {cmd_result.stdout.strip()}")
                            if 'claude' in cmd_result.stdout.lower():
                                print(f"[Terminal] Found claude process: PID {child_pid}")
                                return True
                        except Exception as e:
                            print(f"[Terminal] Error checking PID {child_pid}: {e}")

            print(f"[Terminal] No claude process found")
            return False
        except Exception as e:
            print(f"[Terminal] Error in check_claude_running: {e}")
            return False
        except Exception as e:
            print(f"[Terminal] Error checking claude process: {e}")
            return False

    def get_claude_session_id(self) -> Optional[str]:
        """获取当前运行的 Claude 会话 ID"""
        if not self.pid:
            return None
        try:
            import subprocess
            # 查找 shell 进程的所有子进程
            result = subprocess.run(
                ['pgrep', '-P', str(self.pid)],
                capture_output=True,
                text=True
            )

            if result.returncode == 0:
                child_pids = result.stdout.strip().split('\n')

                # 检查每个子进程的命令行参数
                for child_pid in child_pids:
                    if child_pid:
                        try:
                            # 获取完整的命令行参数
                            cmd_result = subprocess.run(
                                ['ps', '-p', child_pid, '-o', 'args='],
                                capture_output=True,
                                text=True
                            )
                            cmd_line = cmd_result.stdout.strip()
                            print(f"[Terminal] PID {child_pid} full command: {cmd_line}")

                            # 检查是否是 claude --resume 命令
                            if 'claude' in cmd_line.lower() and '--resume' in cmd_line:
                                # 提取 session ID
                                parts = cmd_line.split()
                                for i, part in enumerate(parts):
                                    if part == '--resume' and i + 1 < len(parts):
                                        session_id = parts[i + 1]
                                        print(f"[Terminal] Found Claude session ID: {session_id}")
                                        return session_id
                        except Exception as e:
                            print(f"[Terminal] Error checking PID {child_pid}: {e}")

            return None
        except Exception as e:
            print(f"[Terminal] Error in get_claude_session_id: {e}")
            return None

    def start(self):
        """Start a new PTY session"""
        print(f"[Terminal] Starting new PTY session...")

        self.pid, self.master_fd = pty.fork()
        print(f"[Terminal] PTY forked - PID: {self.pid}, FD: {self.master_fd}")

        if self.pid == 0:
            # Child process - execute shell
            # Set HOME environment variable to ensure correct user context
            home_dir = os.path.expanduser('~')
            os.environ['HOME'] = home_dir

            # Change to initial directory if specified, otherwise home
            target_dir = self.initial_dir if self.initial_dir and os.path.isdir(self.initial_dir) else home_dir
            os.chdir(target_dir)
            print(f"[Terminal] Child process - Changed to directory: {target_dir}")

            # 取消 CLAUDECODE 环境变量，允许在 terminal 中使用 claude 命令
            if 'CLAUDECODE' in os.environ:
                del os.environ['CLAUDECODE']

            # Use zsh with login shell to load ~/.zshrc
            # Try zsh first, fall back to bash if not available
            shell = '/bin/zsh'
            if not os.path.exists(shell):
                shell = '/bin/bash'

            print(f"[Terminal] Child process - Executing shell: {shell}")
            # Always start normal interactive shell
            # We'll send the cd and claude commands after shell starts
            os.execvp(shell, [shell, '-l', '-i'])

        # Parent process
        print(f"[Terminal] Parent process - PTY session started with PID: {self.pid}")
        self.running = True

        # Set non-blocking mode
        flags = fcntl.fcntl(self.master_fd, fcntl.F_GETFL)
        fcntl.fcntl(self.master_fd, fcntl.F_SETFL, flags | os.O_NONBLOCK)

        return self.master_fd

    def resize(self, rows: int, cols: int):
        """Resize the terminal"""
        if self.master_fd:
            winsize = struct.pack('HHHH', rows, cols, 0, 0)
            fcntl.ioctl(self.master_fd, termios.TIOCSWINSZ, winsize)
            # 记录当前终端尺寸
            self.terminal_rows = rows
            self.terminal_cols = cols
            print(f"[Terminal] Resized PTY: {rows}x{cols}")

    def write(self, data: str):
        """Write data to the terminal"""
        if self.master_fd and self.running:
            os.write(self.master_fd, data.encode())
            self.last_activity = datetime.now()  # 更新活动时间

    def save_output(self, data: bytes):
        """保存输出到 scrollback buffer（保留 ANSI 转义序列）"""
        try:
            # 保存原始字节流，包含所有 ANSI 转义序列
            self.scrollback_buffer.append(data)
            self.current_scrollback_size += len(data)

            # 限制 buffer 大小，删除最旧的数据
            while self.current_scrollback_size > self.max_scrollback_bytes and len(self.scrollback_buffer) > 0:
                removed = self.scrollback_buffer.pop(0)
                self.current_scrollback_size -= len(removed)
        except Exception as e:
            print(f"[Terminal] Error saving output: {e}")

    def get_scrollback(self, max_bytes: int = 512 * 1024) -> bytes:
        """获取最近的 scrollback 内容（原始字节流）"""
        if not self.scrollback_buffer:
            return b""

        # 从后往前收集数据，直到达到最大字节数
        result = []
        total_bytes = 0
        for chunk in reversed(self.scrollback_buffer):
            if total_bytes + len(chunk) > max_bytes:
                break
            result.insert(0, chunk)
            total_bytes += len(chunk)

        return b''.join(result)

    def read(self, timeout: float = 0.1) -> bytes:
        """Read data from the terminal"""
        if not self.master_fd or not self.running:
            return b''

        try:
            # Use select to check if data is available
            ready, _, _ = select.select([self.master_fd], [], [], timeout)
            if ready:
                return os.read(self.master_fd, 1024)
        except OSError:
            self.running = False

        return b''

    def close(self):
        """Close the terminal session"""
        self.running = False
        self.websocket = None
        if self.master_fd:
            try:
                os.close(self.master_fd)
            except OSError:
                pass
        if self.pid:
            try:
                os.kill(self.pid, 9)
                os.waitpid(self.pid, 0)
            except (OSError, ChildProcessError):
                pass


async def _mark_terminal_execution_cancelled(
    db: AsyncSession,
    *,
    execution_id: int,
    session_id: str,
    reason: str,
) -> None:
    """将 terminal execution 安全收敛到 cancelled（幂等）"""
    execution_repo = ExecutionRepository(db)
    execution = await execution_repo.get(execution_id)
    if not execution:
        return

    if execution.status not in [ExecutionStatus.RUNNING, ExecutionStatus.PENDING]:
        return

    now = datetime.now()
    old_status = execution.status.value if hasattr(execution.status, "value") else str(execution.status)
    execution.status = ExecutionStatus.CANCELLED
    execution.finished_at = now
    execution.last_activity_at = now
    await db.commit()

    logger.info(
        "[Terminal] Execution status transitioned (%s): execution_id=%s, session_id=%s, %s->cancelled",
        reason,
        execution_id,
        session_id,
        old_status,
    )

    try:
        ws_manager = get_connection_manager()
        await ws_manager.broadcast_terminal_execution_update({
            "id": execution.id,
            "session_id": session_id,
            "status": "cancelled",
            "finished_at": execution.finished_at.isoformat() if execution.finished_at else None,
        })
    except Exception:
        logger.exception(
            "[Terminal] Failed to broadcast cancelled execution update: session_id=%s, execution_id=%s, reason=%s",
            session_id,
            execution_id,
            reason,
        )


async def reconcile_orphan_terminal_executions() -> None:
    """启动时收敛孤儿 terminal running 记录（session 不存在）"""
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                sql_select(
                    Execution.id,
                    Execution.session_id,
                    Execution.status,
                ).where(
                    Execution.execution_type == ExecutionType.TERMINAL,
                    Execution.status.in_([ExecutionStatus.RUNNING, ExecutionStatus.PENDING]),
                    Execution.session_id.isnot(None),
                )
            )
            rows = result.all()

            reconciled = 0
            for execution_id, session_id, _ in rows:
                if not session_id:
                    continue
                if session_id in sessions:
                    continue

                await _mark_terminal_execution_cancelled(
                    db,
                    execution_id=execution_id,
                    session_id=session_id,
                    reason="startup_orphan_reconcile",
                )
                reconciled += 1

            if reconciled > 0:
                logger.info("[Terminal] Reconciled orphan terminal executions: count=%s", reconciled)
    except Exception:
        logger.exception("[Terminal] Failed to reconcile orphan terminal executions on startup")


# Store active sessions - 使用持久化的 session ID
sessions: Dict[str, TerminalSession] = {}

# 后台清理任务
cleanup_task = None


async def cleanup_dead_sessions():
    """后台任务：定期清理已经结束的终端会话"""
    while True:
        try:
            await asyncio.sleep(60)  # 每分钟检查一次

            # 检查所有会话
            dead_sessions = []
            for session_id, session in sessions.items():
                # 只清理进程已经结束的会话
                if not session.is_process_alive():
                    dead_sessions.append(session_id)
                    print(f"[Terminal] Session {session_id} process died (PID: {session.pid})")

            # 关闭已死亡的会话并同步 execution 终态
            for session_id in dead_sessions:
                session = sessions.get(session_id)
                if session:
                    execution_id = session.execution_id

                    try:
                        if execution_id:
                            async with AsyncSessionLocal() as db:
                                await _mark_terminal_execution_cancelled(
                                    db,
                                    execution_id=execution_id,
                                    session_id=session_id,
                                    reason="dead_session_cleanup",
                                )
                    except Exception:
                        logger.exception(
                            "[Terminal] Failed to finalize execution for dead session: session_id=%s, execution_id=%s",
                            session_id,
                            execution_id,
                        )

                    session.close()
                    del sessions[session_id]
                    print(f"[Terminal] Cleaned up dead session: {session_id}")

        except Exception as e:
            print(f"[Terminal] Error in cleanup task: {e}")


def start_cleanup_task():
    """启动后台清理任务"""
    global cleanup_task
    if cleanup_task is None:
        cleanup_task = asyncio.create_task(cleanup_dead_sessions())
        print(f"[Terminal] Cleanup task started (only removes dead processes)")


def stop_cleanup_task():
    """停止后台清理任务"""
    global cleanup_task
    if cleanup_task:
        cleanup_task.cancel()
        cleanup_task = None
        print("[Terminal] Cleanup task stopped")


@router.websocket("/ws")
async def terminal_websocket(
    websocket: WebSocket,
    db: AsyncSession = Depends(get_db),
    project_path: str = None,
    session_id: str = None,  # 支持重新连接到已存在的 session
    auto_start_claude: bool = False,  # 是否自动启动 Claude
    claude_resume_session: str = None  # Claude 会话恢复的 session ID
):
    """WebSocket endpoint for terminal interaction"""
    await websocket.accept()

    print(f"[Terminal] ========== NEW WEBSOCKET CONNECTION ==========")
    print(f"[Terminal] Requested session ID: {session_id}")
    print(f"[Terminal] Project path param: {project_path}")
    print(f"[Terminal] Project path repr: {repr(project_path)}")
    print(f"[Terminal] Project path type: {type(project_path)}")
    print(f"[Terminal] Auto-start Claude param: {auto_start_claude}")
    print(f"[Terminal] Claude resume session param: {claude_resume_session}")
    print(f"[Terminal] Active sessions before: {len(sessions)}")
    print(f"[Terminal] Active session IDs: {list(sessions.keys())}")

    # 检查是否要重新连接到已存在的 session
    if session_id and session_id in sessions:
        session = sessions[session_id]
        print(f"[Terminal] ========== RECONNECTING TO EXISTING SESSION ==========")
        print(f"[Terminal] Reconnecting to existing session: {session_id}")
        print(f"[Terminal] Session PID: {session.pid}, Process alive: {session.is_process_alive()}")

        if not session.is_process_alive():
            print(f"[Terminal] ❌ Session {session_id} process is dead, creating new session")
            session.close()
            del sessions[session_id]
            session_id = None  # 创建新 session
        else:
            # 重新连接到已存在的 session
            print(f"[Terminal] ✅ Process is alive, proceeding with reconnection")
            session.websocket = websocket
            print(f"[Terminal] Successfully reconnected to session {session_id}")

            # 仅做会话恢复提示与回放，不注入额外命令，保留当前 shell 上下文
            print(f"[Terminal] ========== SESSION RECONNECT CONTEXT ==========")
            print(f"[Terminal] Session reconnect keeps existing shell context")
            print(f"[Terminal] Waiting for frontend restore_ready signal...")

            # 标记为等待 restore_ready
            session.waiting_for_restore_ready = True
            session.restore_ready_timeout = asyncio.create_task(
                asyncio.sleep(5.0)  # 5秒超时兜底
            )

            # 重连时不需要这些变量，设置为 None
            initial_dir = None
            auto_start_claude = False
    else:
        session_id = None  # 创建新 session

    # 如果没有找到已存在的 session，创建新的
    if session_id is None:
        session_id = str(uuid.uuid4())
        print(f"[Terminal] Creating new session with ID: {session_id}")

        # Get project path from URL parameter or use first enabled path
        initial_dir = None
        # 使用传入的 auto_start_claude 参数

        if project_path:
            # Use the specified project path
            initial_dir = project_path
            # auto_start_claude 已经从参数传入，不需要重新设置
            print(f"[Terminal] Using specified project path: {initial_dir}")
            print(f"[Terminal] Auto-start Claude: {auto_start_claude}")
        else:
            # Get first enabled project path from database
            try:
                repository = ProjectPathRepository(db)
                service = ProjectPathService(repository)
                enabled_paths = await service.get_enabled_paths()
                print(f"[Terminal] Found {len(enabled_paths)} enabled project paths")

                if enabled_paths:
                    # Use the first enabled project path
                    first_path = enabled_paths[0]
                    initial_dir = first_path.path
                    # auto_start_claude 保持传入的值
                    print(f"[Terminal] Will start in project directory: {initial_dir}")
                    print(f"[Terminal] Auto-start Claude: {auto_start_claude}")
            except Exception as e:
                print(f"[Terminal] Failed to get project paths: {e}")
                # Continue with default behavior (home directory)

        # Create a new terminal session
        session = TerminalSession(
            session_id=session_id,
            initial_dir=initial_dir,
            auto_start_claude=auto_start_claude,
            claude_resume_session=claude_resume_session
        )
        print(f"[Terminal] Creating new TerminalSession with ID: {session_id}")
        print(f"[Terminal] Initial dir: {initial_dir}, Auto-start Claude: {auto_start_claude}, Claude resume: {claude_resume_session}")
        sessions[session_id] = session
        session.websocket = websocket
        print(f"[Terminal] Active sessions after: {len(sessions)}")

        # 创建执行记录
        try:
            task_repo = TaskRepository(db)
            execution_repo = ExecutionRepository(db)

            # 创建 Task - 使用 Schema
            from app.schemas.task import TaskCreate
            task_data = TaskCreate(
                title=f"Terminal Session: {initial_dir or 'Home'}" if initial_dir else "Terminal Session",
                description=f"Terminal session started at {initial_dir or 'home directory'}",
                project_path=initial_dir,
                status=TaskStatus.RUNNING
            )
            task = await task_repo.create(task_data)
            await db.commit()
            await db.refresh(task)

            # 确保 terminal execution 使用有效 workflow_id（兼容开启外键约束的环境）
            from sqlalchemy import select
            from app.models.workflow import Workflow

            workflow_result = await db.execute(sql_select(Workflow.id).order_by(Workflow.id.asc()).limit(1))
            workflow_id = workflow_result.scalar_one_or_none()

            if workflow_id is None:
                default_workflow = Workflow(
                    name="terminal-monitor-workflow",
                    description="System workflow for terminal session execution tracking",
                    version="1.0.0",
                    active=True,
                )
                db.add(default_workflow)
                await db.flush()
                workflow_id = default_workflow.id

            # 创建 Execution（直接使用 ORM，避免 schema 包含模型不存在字段）
            from app.models.task import Execution
            execution = await execution_repo.create(Execution(
                task_id=task.id,
                workflow_id=workflow_id,
                execution_type=ExecutionType.TERMINAL,
                status=ExecutionStatus.RUNNING,
                agent_id=None,
                session_id=session_id,
                terminal_pid=session.pid,
                terminal_cwd=initial_dir or os.path.expanduser('~'),
                terminal_command="shell session",
                started_at=datetime.now(),
                last_activity_at=datetime.now(),
                is_background=True,
            ))
            await db.commit()
            await db.refresh(execution)

            session.execution_id = execution.id
            print(f"[Terminal] Created execution record: {execution.id} for session {session_id}")

            # 广播执行记录创建
            ws_manager = get_connection_manager()
            await ws_manager.broadcast_terminal_execution_update({
                "id": execution.id,
                "task_id": task.id,
                "session_id": session_id,
                "execution_type": "terminal",
                "status": "running",
                "terminal_pid": session.pid,
                "terminal_cwd": initial_dir or os.path.expanduser('~'),
                "terminal_command": "shell session",
                "started_at": execution.started_at.isoformat() if execution.started_at else None,
                "created_at": execution.created_at.isoformat(),
                "task": {
                    "id": task.id,
                    "title": task.title,
                    "description": task.description,
                    "project_path": task.project_path
                }
            })
            print(f"[Terminal] Broadcasted terminal execution update for session {session_id}")

        except Exception as e:
            error_message = f"创建 Terminal 执行记录失败: {str(e)}"
            logger.exception(f"[Terminal] Failed to create execution record for session {session_id}")

            # 通过 terminal websocket 直接回传错误，前端可见
            try:
                await websocket.send_text(
                    f"\r\n\x1b[31m✗ {error_message}\x1b[0m\r\n"
                    "\x1b[33m请检查后端日志 backend.log 获取详细错误信息\x1b[0m\r\n"
                )
            except Exception:
                pass

            # 同步广播一条失败状态到 execution 监控通道，避免静默失败
            try:
                ws_manager = get_connection_manager()
                await ws_manager.broadcast_terminal_execution_update({
                    "id": -1,
                    "session_id": session_id,
                    "execution_type": "terminal",
                    "status": "failed",
                    "error_message": error_message,
                    "created_at": datetime.now().isoformat(),
                    "task": {
                        "id": -1,
                        "title": "Terminal execution creation failed",
                        "description": error_message,
                        "project_path": initial_dir
                    }
                })
            except Exception:
                logger.exception("[Terminal] Failed to broadcast terminal execution creation failure")

        # Send session ID to client
        logger.info("[Terminal] Sending SESSION_ID: session_id=%s", session_id)
        await websocket.send_text(f"\x1b]0;SESSION_ID:{session_id}\x07")  # 使用 OSC 序列发送 session ID

    try:
        # Start the PTY (only for new sessions)
        is_new_session = not session.running
        if is_new_session:
            print(f"[Terminal] Starting PTY for session {session_id}...")
            session.start()
            print(f"[Terminal] PTY started successfully - PID: {session.pid}, FD: {session.master_fd}")

            # 如果设置了 auto_start_claude，等待 shell 启动后自动执行 claude 命令
            if session.auto_start_claude:
                print(f"[Terminal] Auto-start Claude enabled, will send 'claude' command after shell initialization")
                # 等待 shell 初始化（加载 .zshrc 等）
                await asyncio.sleep(1.5)
                # 发送 claude 命令
                try:
                    session.write('claude\n')
                    print(f"[Terminal] ✅ Sent 'claude' command to terminal")
                except Exception as e:
                    print(f"[Terminal] ❌ Failed to send 'claude' command: {e}")

            # 如果设置了 claude_resume_session，等待 shell 启动后自动执行 claude --resume 命令
            if session.claude_resume_session:
                print(f"[Terminal] Claude resume session enabled, will send 'claude --resume {session.claude_resume_session}' command")
                # 等待 shell 初始化（加载 .zshrc 等）
                await asyncio.sleep(1.5)
                # 如果有 initial_dir，先切换到该目录
                if session.initial_dir:
                    try:
                        cd_command = f'cd "{session.initial_dir}"\n'
                        session.write(cd_command)
                        print(f"[Terminal] ✅ Sent 'cd' command to terminal: {session.initial_dir}")
                        # 等待 cd 命令执行完成
                        await asyncio.sleep(0.3)
                    except Exception as e:
                        print(f"[Terminal] ❌ Failed to send 'cd' command: {e}")
                # 发送 claude --resume 命令
                try:
                    resume_command = f'claude --resume {session.claude_resume_session}\n'
                    session.write(resume_command)
                    print(f"[Terminal] ✅ Sent 'claude --resume' command to terminal")
                except Exception as e:
                    print(f"[Terminal] ❌ Failed to send 'claude --resume' command: {e}")
                    # 发送错误消息到终端
                    try:
                        await websocket.send_text(f"\r\n\x1b[31m✗ 无法执行 claude --resume 命令: {str(e)}\x1b[0m\r\n")
                    except Exception:
                        pass

        # 保持纯 shell 语义：不自动注入 claude 命令（除非明确设置 auto_start_claude）

        # Create tasks for reading from PTY and WebSocket
        output_buffer = []  # 缓冲输出
        last_update_time = datetime.now()

        async def read_from_pty():
            """Read output from PTY and send to WebSocket"""
            nonlocal last_update_time
            print(f"[Terminal] read_from_pty started for session {session_id}, session.running={session.running}")
            pty_frame_count = 0
            while session.running:
                try:
                    data = await asyncio.get_event_loop().run_in_executor(
                        None, session.read, 0.1
                    )
                    if data:
                        pty_frame_count += 1
                        preview = data[:120].decode('utf-8', errors='ignore').replace('\n', '\\n').replace('\r', '\\r')
                        logger.info(
                            "[Terminal] pty output recv: session_id=%s, frame=%s, bytes=%s, preview=%r",
                            session_id,
                            pty_frame_count,
                            len(data),
                            preview,
                        )

                        # 保存到 session 的 scrollback buffer
                        session.save_output(data)

                        decoded_data = data.decode('utf-8', errors='ignore')
                        await websocket.send_text(decoded_data)
                        logger.info(
                            "[Terminal] pty output forwarded: session_id=%s, frame=%s, bytes=%s",
                            session_id,
                            pty_frame_count,
                            len(data),
                        )

                        if os.environ.get("TERMINAL_DEBUG_ECHO", "0") == "1":
                            try:
                                await websocket.send_text(json.dumps({
                                    "type": "debug_output_forwarded",
                                    "frame": pty_frame_count,
                                    "bytes": len(data),
                                }))
                            except Exception:
                                logger.exception(
                                    "[Terminal] debug output forwarded send failed: session_id=%s, frame=%s",
                                    session_id,
                                    pty_frame_count,
                                )

                        # 缓冲输出（限制大小）
                        output_buffer.append(decoded_data)
                        # 保持最近 10MB 的输出
                        total_size = sum(len(s) for s in output_buffer)
                        while total_size > 10 * 1024 * 1024 and len(output_buffer) > 1:
                            removed = output_buffer.pop(0)
                            total_size -= len(removed)

                        # 每 5 秒更新一次数据库
                        now = datetime.now()
                        if (now - last_update_time).total_seconds() >= 5:
                            if session.execution_id:
                                try:
                                    execution_repo = ExecutionRepository(db)
                                    output_text = ''.join(output_buffer)
                                    await execution_repo.update_terminal_execution(
                                        execution_id=session.execution_id,
                                        output=output_text
                                    )
                                    last_update_time = now
                                except Exception as e:
                                    print(f"[Terminal] Failed to update execution output: {e}")

                except Exception as e:
                    print(f"[Terminal] Error reading from PTY: {e}")
                    import traceback
                    traceback.print_exc()
                    logger.exception("[Terminal] read_from_pty fatal error: session_id=%s", session_id)
                    break
                await asyncio.sleep(0.01)
            print(f"[Terminal] read_from_pty exited for session {session_id}")

        async def read_from_websocket():
            """Read input from WebSocket and write to PTY"""
            print(f"[Terminal] read_from_websocket started for session {session_id}")
            while session.running:
                try:
                    message = await websocket.receive_text()
                    import json

                    try:
                        data = json.loads(message)
                    except json.JSONDecodeError:
                        logger.warning(
                            "[Terminal] recv parse fallback continue: session_id=%s, raw=%r",
                            session_id,
                            message[:200],
                        )
                        continue

                    msg_type = data.get('type')
                    logger.info(
                        "[Terminal] recv msg: session_id=%s, type=%s",
                        session_id,
                        msg_type,
                    )

                    if msg_type == 'input':
                        input_data = data.get('data', '')
                        seq = data.get('seq')
                        try:
                            await asyncio.get_event_loop().run_in_executor(
                                None, session.write, input_data
                            )
                            logger.info(
                                "[Terminal] pty write success: session_id=%s, bytes=%s, seq=%s",
                                session_id,
                                len(input_data),
                                seq,
                            )
                        except Exception:
                            logger.exception(
                                "[Terminal] pty write failed: session_id=%s, seq=%s",
                                session_id,
                                seq,
                            )
                            continue

                        if isinstance(seq, int):
                            try:
                                await websocket.send_text(json.dumps({"type": "ack", "seq": seq}))
                                logger.info("[Terminal] ack sent: session_id=%s, seq=%s", session_id, seq)
                            except Exception:
                                logger.exception("[Terminal] ack send failed: session_id=%s, seq=%s", session_id, seq)
                                continue

                        if os.environ.get("TERMINAL_DEBUG_ECHO", "0") == "1" and isinstance(seq, int):
                            try:
                                await websocket.send_text(json.dumps({
                                    "type": "debug_input_accepted",
                                    "seq": seq,
                                    "process_alive": session.is_process_alive(),
                                    "pid": session.pid,
                                }))
                            except Exception:
                                logger.exception("[Terminal] debug echo send failed: session_id=%s, seq=%s", session_id, seq)
                                continue
                    elif msg_type == 'resize':
                        rows = data.get('rows', 24)
                        cols = data.get('cols', 80)
                        try:
                            await asyncio.get_event_loop().run_in_executor(
                                None, session.resize, rows, cols
                            )
                        except Exception:
                            logger.exception(
                                "[Terminal] resize failed: session_id=%s, rows=%s, cols=%s",
                                session_id,
                                rows,
                                cols,
                            )
                            continue
                    elif msg_type == 'ping':
                        # 处理心跳 ping，回复 pong
                        try:
                            await websocket.send_text(json.dumps({"type": "pong"}))
                            print(f"[Terminal] Heartbeat pong sent: session_id={session_id}")
                        except Exception as e:
                            print(f"[Terminal] Failed to send pong: session_id={session_id}, error={e}")
                        continue
                    elif msg_type == 'restore_ready':
                        # 前端已完成首次稳定 fit，可以开始回放
                        if hasattr(session, 'waiting_for_restore_ready') and session.waiting_for_restore_ready:
                            print(f"[Terminal] ✅ Received restore_ready signal from frontend")
                            session.waiting_for_restore_ready = False

                            # 取消超时任务
                            if hasattr(session, 'restore_ready_timeout'):
                                session.restore_ready_timeout.cancel()

                            # 获取前端当前的终端尺寸
                            rows = data.get('rows', 24)
                            cols = data.get('cols', 80)
                            print(f"[Terminal] Frontend terminal size: rows={rows}, cols={cols}")

                            # 🔧 关键修复：在回放前先调整 PTY 尺寸以匹配前端
                            try:
                                session.resize(rows, cols)
                                print(f"[Terminal] ✅ Resized PTY to match frontend: {rows}x{cols}")
                            except Exception as e:
                                logger.error(f"[Terminal] Failed to resize PTY: {e}")

                            # 发送清屏命令，确保干净的起始状态
                            await websocket.send_text("\x1b[2J\x1b[H")
                            print(f"[Terminal] ✅ Sent clear screen command")

                            # 发送重连成功消息
                            print(f"[Terminal] Sending reconnection success message...")
                            await websocket.send_text("\r\n\x1b[32m✓ Reconnected to existing session\x1b[0m\r\n")
                            print(f"[Terminal] ✅ Reconnection message sent")

                            # 回放最近终端输出（原始字节流，包含 ANSI 序列）
                            try:
                                logger.info("[Terminal] Reconnect replay started: session_id=%s", session_id)
                                scrollback_bytes = session.get_scrollback(max_bytes=512 * 1024)  # 最多 512KB
                                replayed = bool(scrollback_bytes)

                                if scrollback_bytes:
                                    # 发送原始字节流（包含所有 ANSI 转义序列）
                                    await websocket.send_bytes(scrollback_bytes)
                                    print(f"[Terminal] ✅ Replayed {len(scrollback_bytes)} bytes of scrollback for session {session_id}")
                                else:
                                    # 避免前端黑屏误判：无回放时明确给出提示
                                    await websocket.send_text("\r\n\x1b[33mℹ Session restored (no scrollback available)\x1b[0m\r\n")
                                    # 主动触发一次换行，尽量拉起当前 shell/CLI 的可见提示符
                                    try:
                                        await asyncio.get_event_loop().run_in_executor(None, session.write, '\n')
                                    except Exception:
                                        logger.exception("[Terminal] Failed to request prompt after no-scrollback restore: session_id=%s", session_id)

                                logger.info("[Terminal] Reconnect replay finished: session_id=%s, replayed=%s", session_id, replayed)
                            except Exception as e:
                                logger.exception("[Terminal] Reconnect replay failed: session_id=%s", session_id)
                                print(f"[Terminal] Failed to replay scrollback for session {session_id}: {e}")

                            print(f"[Terminal] ========== RECONNECTION COMPLETE ==========")
                    else:
                        logger.warning(
                            "[Terminal] unknown msg type continue: session_id=%s, type=%r",
                            session_id,
                            msg_type,
                        )
                        continue
                except WebSocketDisconnect:
                    print(f"[Terminal] WebSocket disconnected in read_from_websocket for session {session_id}")
                    break
                except Exception as e:
                    print(f"[Terminal] Error reading from WebSocket: {e}")
                    import traceback
                    traceback.print_exc()
                    continue
            print(f"[Terminal] read_from_websocket exited for session {session_id}")

        async def handle_restore_timeout():
            """处理 restore_ready 超时兜底"""
            if not hasattr(session, 'waiting_for_restore_ready') or not session.waiting_for_restore_ready:
                return

            try:
                # 等待超时任务
                await session.restore_ready_timeout

                # 如果还在等待，说明超时了
                if session.waiting_for_restore_ready:
                    print(f"[Terminal] ⚠️ restore_ready timeout, proceeding with fallback replay")
                    session.waiting_for_restore_ready = False

                    # 发送清屏命令
                    await websocket.send_text("\x1b[2J\x1b[H")

                    # 发送重连成功消息
                    await websocket.send_text("\r\n\x1b[32m✓ Reconnected to existing session\x1b[0m\r\n")

                    # 回放 scrollback（原始字节流）
                    try:
                        scrollback_bytes = session.get_scrollback(max_bytes=512 * 1024)
                        if scrollback_bytes:
                            await websocket.send_bytes(scrollback_bytes)
                            print(f"[Terminal] ✅ Fallback replayed {len(scrollback_bytes)} bytes of scrollback for session {session_id}")
                        else:
                            await websocket.send_text("\r\n\x1b[33mℹ Session restored (no scrollback available)\x1b[0m\r\n")
                    except Exception as e:
                        logger.exception("[Terminal] Fallback replay failed: session_id=%s", session_id)
            except asyncio.CancelledError:
                # 正常取消，前端已发送 restore_ready
                pass
            except Exception as e:
                logger.exception("[Terminal] Error in restore timeout handler: session_id=%s", session_id)

        # Run tasks concurrently
        print(f"[Terminal] Starting read tasks for session {session_id}...")
        tasks = [read_from_pty(), read_from_websocket()]

        # 如果是恢复模式，添加超时处理任务
        if hasattr(session, 'waiting_for_restore_ready') and session.waiting_for_restore_ready:
            tasks.append(handle_restore_timeout())

        results = await asyncio.gather(*tasks, return_exceptions=True)
        print(f"[Terminal] Read tasks completed for session {session_id}, results: {results}")

    except WebSocketDisconnect:
        print(f"[Terminal] WebSocket disconnected: {session_id}")
    except Exception as e:
        print(f"[Terminal] Terminal error for session {session_id}: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Clean up - 只断开 WebSocket，不关闭 session
        print(f"[Terminal] WebSocket disconnected for session {session_id}...")
        if session_id in sessions:
            session = sessions[session_id]
            session.websocket = None  # 断开 WebSocket 连接
            print(f"[Terminal] Session {session_id} WebSocket disconnected, but session kept alive")
            print(f"[Terminal] Session PID: {session.pid}, Process alive: {session.is_process_alive()}")

            # 保存最终输出并更新执行记录
            if session.execution_id:
                try:
                    execution_repo = ExecutionRepository(db)
                    execution = await execution_repo.get(session.execution_id)
                    if execution:
                        # 保存最终输出
                        if output_buffer:
                            output_text = ''.join(output_buffer)
                            execution.terminal_output = output_text

                        # 更新最后活动时间
                        execution.last_activity_at = datetime.now()

                        # 如果进程已结束，更新状态（仅在运行态时更新，避免覆盖手动取消）
                        if (
                            not session.is_process_alive()
                            and execution.status in [ExecutionStatus.RUNNING, ExecutionStatus.PENDING]
                        ):
                            execution.status = ExecutionStatus.SUCCEEDED
                            execution.finished_at = datetime.now()
                            print(f"[Terminal] Process ended, marking execution {session.execution_id} as succeeded")

                            # 广播执行完成
                            ws_manager = get_connection_manager()
                            await ws_manager.broadcast_terminal_execution_update({
                                "id": execution.id,
                                "session_id": session_id,
                                "status": "succeeded",
                                "finished_at": execution.finished_at.isoformat() if execution.finished_at else None
                            })

                        await db.commit()
                        print(f"[Terminal] Updated execution {session.execution_id}")
                except Exception as e:
                    print(f"[Terminal] Failed to update execution: {e}")
                    import traceback
                    traceback.print_exc()

        print(f"[Terminal] Active sessions remaining: {len(sessions)}")
        try:
            await websocket.close()
        except:
            pass


@router.get("/claude-conversations")
async def list_claude_conversations(limit: int = 50):
    """列出本机可恢复的 Claude Code 会话（基于 ~/.claude/projects/*.jsonl）"""
    projects_dir = Path.home() / ".claude" / "projects"
    if not projects_dir.exists():
        return JSONResponse({
            "available": True,
            "count": 0,
            "items": [],
        })

    session_files = sorted(
        projects_dir.rglob("*.jsonl"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )

    items: List[Dict[str, Any]] = []
    for file_path in session_files[: max(limit * 3, 150)]:
        try:
            stat = file_path.stat()
            rel_path = file_path.relative_to(projects_dir)
            rel_parts = rel_path.parts
            project_hint = rel_parts[0] if len(rel_parts) > 1 else ""
            session_id = file_path.stem

            title = session_id
            last_model = None

            recent_lines: List[str] = []
            with file_path.open("r", encoding="utf-8") as f:
                for line in f:
                    recent_lines.append(line)
                    if len(recent_lines) > 120:
                        recent_lines.pop(0)

            for line in reversed(recent_lines):
                try:
                    record = json.loads(line)
                except json.JSONDecodeError:
                    continue

                message = record.get("message")
                if not isinstance(message, dict):
                    continue

                if not last_model and isinstance(message.get("model"), str):
                    last_model = message.get("model")

                content = message.get("content")
                if not isinstance(content, list):
                    continue

                for block in content:
                    if not isinstance(block, dict):
                        continue
                    text = block.get("text")
                    if isinstance(text, str) and text.strip():
                        title = text.strip().splitlines()[0][:120]
                        break
                if title != session_id:
                    break

            items.append({
                "session_id": session_id,
                "title": title,
                "project_hint": project_hint,
                "last_model": last_model,
                "last_updated": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "source_file": str(file_path),
            })
        except Exception:
            logger.exception("[Terminal] Failed to parse claude conversation file: %s", file_path)
            continue

        if len(items) >= limit:
            break

    return JSONResponse({
        "available": True,
        "count": len(items),
        "items": items,
    })


@router.get("/status")
async def terminal_status():
    """Get terminal service status"""
    active_sessions = []
    for session_id, session in sessions.items():
        active_sessions.append({
            "session_id": session_id,
            "pid": session.pid,
            "running": session.running,
            "process_alive": session.is_process_alive(),
            "initial_dir": session.initial_dir,
            "claude_code_id": session.claude_resume_session,  # Claude Code 的 session ID
            "created_at": session.created_at.isoformat(),
            "last_activity": session.last_activity.isoformat(),
        })

    return JSONResponse({
        "available": True,
        "active_sessions_count": len(sessions),
        "active_sessions": active_sessions,
        "platform": os.name,
    })


@router.get("/session/{session_id}/claude-status")
async def get_claude_status(session_id: str):
    """检查指定 session 中的 Claude 进程是否还在运行"""
    if session_id not in sessions:
        return JSONResponse({
            "running": False,
            "session_exists": False,
            "process_alive": False,
            "claude_resume_session": None,
            "initial_dir": None,
        })

    session = sessions[session_id]
    claude_running = session.check_claude_running()

    # 尝试获取当前运行的 Claude 会话 ID
    detected_session_id = None
    if claude_running:
        detected_session_id = session.get_claude_session_id()

    # 优先使用检测到的会话 ID，如果没有则使用创建时传入的
    claude_session_id = detected_session_id or (session.claude_resume_session if hasattr(session, 'claude_resume_session') else None)

    return JSONResponse({
        "running": claude_running,
        "session_exists": True,
        "process_alive": session.is_process_alive(),
        "claude_resume_session": claude_session_id,
        "initial_dir": session.initial_dir,
    })


@router.post("/sessions/{session_id}/close")
async def close_session(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """手动关闭指定的 terminal session"""
    session = sessions.get(session_id)
    session_exists = session is not None
    execution_id = session.execution_id if session else None

    logger.info(
        "[Terminal] Close session requested: session_id=%s, execution_id=%s, session_exists=%s",
        session_id,
        execution_id,
        session_exists,
    )

    if not session:
        return JSONResponse({"success": False, "message": f"Session {session_id} not found"}, status_code=404)

    # 先更新 execution 状态，确保历史页可见终态
    if execution_id:
        try:
            await _mark_terminal_execution_cancelled(
                db,
                execution_id=execution_id,
                session_id=session_id,
                reason="manual_close",
            )
        except Exception:
            await db.rollback()
            logger.exception(
                "[Terminal] Failed to update execution when closing session: session_id=%s, execution_id=%s",
                session_id,
                execution_id,
            )

    session.close()
    del sessions[session_id]

    logger.info(
        "[Terminal] Session closed: session_id=%s, active_sessions_count=%s",
        session_id,
        len(sessions),
    )

    return JSONResponse({"success": True, "message": f"Session {session_id} closed"})

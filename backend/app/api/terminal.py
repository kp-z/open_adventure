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
from typing import Dict, Optional
from datetime import datetime, timedelta

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.repositories.project_path_repository import ProjectPathRepository
from app.services.project_path_service import ProjectPathService
from app.repositories.executions_repo import ExecutionRepository
from app.repositories.task_repository import TaskRepository
from app.models.task import ExecutionType, ExecutionStatus, TaskStatus
from app.services.websocket_manager import get_connection_manager

router = APIRouter()


class TerminalSession:
    """Manages a PTY terminal session"""

    def __init__(self, session_id: str, initial_dir: Optional[str] = None, auto_start_claude: bool = False):
        self.session_id = session_id
        self.master_fd = None
        self.pid = None
        self.running = False
        self.last_activity = datetime.now()
        self.created_at = datetime.now()
        self.initial_dir = initial_dir
        self.auto_start_claude = auto_start_claude
        self.websocket = None  # 当前连接的 WebSocket
        self.execution_id = None  # 关联的 execution ID
        self.claude_running = False  # 标记是否运行了 claude code
        self.scrollback_buffer = []  # 保存终端输出历史
        self.max_scrollback_lines = 10000  # 最大保存行数

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

    def start(self):
        """Start a new PTY session"""
        print(f"[Terminal] Starting new PTY session...")

        # 在 fork 前，设置所有非标准文件描述符为 FD_CLOEXEC
        # 这样子进程 exec 时会自动关闭这些描述符（包括 8000 端口的 socket）
        import resource
        max_fd = resource.getrlimit(resource.RLIMIT_NOFILE)[0]
        for fd in range(3, min(max_fd, 1024)):  # 从 3 开始（跳过 stdin/stdout/stderr）
            try:
                flags = fcntl.fcntl(fd, fcntl.F_GETFD)
                fcntl.fcntl(fd, fcntl.F_SETFD, flags | fcntl.FD_CLOEXEC)
            except (OSError, ValueError):
                pass  # 忽略无效的文件描述符

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

    def write(self, data: str):
        """Write data to the terminal"""
        if self.master_fd and self.running:
            os.write(self.master_fd, data.encode())
            self.last_activity = datetime.now()  # 更新活动时间

    def save_output(self, data: bytes):
        """保存输出到 scrollback buffer"""
        try:
            text = data.decode('utf-8', errors='ignore')
            # 按行分割并保存
            lines = text.split('\n')
            self.scrollback_buffer.extend(lines)

            # 限制 buffer 大小
            if len(self.scrollback_buffer) > self.max_scrollback_lines:
                self.scrollback_buffer = self.scrollback_buffer[-self.max_scrollback_lines:]
        except Exception as e:
            print(f"[Terminal] Error saving output: {e}")

    def get_scrollback(self, lines: int = 1000) -> str:
        """获取最近的 scrollback 内容"""
        if not self.scrollback_buffer:
            return ""

        # 获取最近的 N 行
        recent_lines = self.scrollback_buffer[-lines:]
        return '\n'.join(recent_lines)

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

            # 关闭已死亡的会话
            for session_id in dead_sessions:
                session = sessions.get(session_id)
                if session:
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
    session_id: str = None  # 支持重新连接到已存在的 session
):
    """WebSocket endpoint for terminal interaction"""
    await websocket.accept()

    print(f"[Terminal] ========== NEW WEBSOCKET CONNECTION ==========")
    print(f"[Terminal] Requested session ID: {session_id}")
    print(f"[Terminal] Project path param: {project_path}")
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

            # 检查是否有 claude 进程在运行
            print(f"[Terminal] ========== CHECKING CLAUDE PROCESS ==========")
            claude_was_running = session.check_claude_running()
            print(f"[Terminal] Claude process running: {claude_was_running}")

            # 等待前端 xterm 准备好（给 React 渲染和 xterm.open() 一些时间）
            print(f"[Terminal] Waiting 500ms for frontend to be ready...")
            await asyncio.sleep(0.5)
            print(f"[Terminal] Frontend should be ready now")

            # 发送重连成功消息
            print(f"[Terminal] Sending reconnection success message...")
            await websocket.send_text("\r\n\x1b[32m✓ Reconnected to existing session\x1b[0m\r\n")
            print(f"[Terminal] ✅ Reconnection message sent")

            # 如果 claude 还在运行，发送 Ctrl+L 刷新界面
            if claude_was_running:
                print(f"[Terminal] ========== CLAUDE IS RUNNING - REFRESHING ==========")
                print(f"[Terminal] Sending Ctrl+L to refresh Claude interface")
                await asyncio.sleep(0.2)  # 等待消息显示
                session.write('\x0c')  # Ctrl+L
                print(f"[Terminal] ✅ Ctrl+L sent")
                session.claude_running = True
            else:
                print(f"[Terminal] ========== CLAUDE NOT RUNNING - STARTING WITH -c ==========")
                print(f"[Terminal] Claude not running, starting with 'claude -c'")
                await asyncio.sleep(0.3)
                print(f"[Terminal] Sending 'claude -c\\n' to PTY...")
                session.write('claude -c\n')
                print(f"[Terminal] ✅ 'claude -c' command sent")
                session.claude_running = True

            print(f"[Terminal] ========== RECONNECTION COMPLETE ==========")

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
        auto_start_claude = False

        if project_path:
            # Use the specified project path
            initial_dir = project_path
            auto_start_claude = True
            print(f"[Terminal] Using specified project path: {initial_dir}")
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
                    auto_start_claude = True
                    print(f"[Terminal] Will start in project directory: {initial_dir}")
                    print(f"[Terminal] Auto-start Claude: {auto_start_claude}")
            except Exception as e:
                print(f"[Terminal] Failed to get project paths: {e}")
                # Continue with default behavior (home directory)

        # Create a new terminal session
        session = TerminalSession(session_id=session_id, initial_dir=initial_dir, auto_start_claude=auto_start_claude)
        print(f"[Terminal] Creating new TerminalSession with ID: {session_id}")
        print(f"[Terminal] Initial dir: {initial_dir}, Auto-start Claude: {auto_start_claude}")
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

            # 创建 Execution - 使用 Schema
            from app.schemas.executions import ExecutionCreate
            execution_data = ExecutionCreate(
                task_id=task.id,
                workflow_id=0,  # Terminal 不需要 workflow
                execution_type=ExecutionType.TERMINAL,
                status=ExecutionStatus.RUNNING,
                agent_id=None,
                session_id=session_id,
                terminal_pid=session.pid,
                terminal_cwd=initial_dir or os.path.expanduser('~'),
                terminal_command="shell session",
                started_at=datetime.now(),
                last_activity_at=datetime.now(),
                is_background=True
            )
            execution = await execution_repo.create(execution_data)
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
            print(f"[Terminal] Failed to create execution record: {e}")
            import traceback
            traceback.print_exc()

        # Send session ID to client
        await websocket.send_text(f"\x1b]0;SESSION_ID:{session_id}\x07")  # 使用 OSC 序列发送 session ID

    try:
        # Start the PTY (only for new sessions)
        is_new_session = not session.running
        if is_new_session:
            print(f"[Terminal] Starting PTY for session {session_id}...")
            session.start()
            print(f"[Terminal] PTY started successfully - PID: {session.pid}, FD: {session.master_fd}")

        # If auto_start_claude is enabled, send commands after a short delay (only for new sessions)
        if auto_start_claude and initial_dir and is_new_session:
            print(f"[Terminal] Setting up auto-start commands for: {initial_dir}")
            async def send_startup_commands():
                """Send cd and claude commands after shell is ready"""
                await asyncio.sleep(0.5)  # Wait for shell to be ready
                try:
                    print(f"[Terminal] Sending cd command to: {initial_dir}")
                    # Send cd command
                    cd_command = f'cd "{initial_dir}"\n'
                    await asyncio.get_event_loop().run_in_executor(
                        None, session.write, cd_command
                    )
                    await asyncio.sleep(0.2)
                    print(f"[Terminal] Sending claude command")
                    # Send claude command
                    await asyncio.get_event_loop().run_in_executor(
                        None, session.write, 'claude\n'
                    )
                    # 标记 claude 正在运行
                    session.claude_running = True
                    print(f"[Terminal] Startup commands sent successfully")
                except Exception as e:
                    print(f"[Terminal] Error sending startup commands: {e}")

            # Start the startup commands task
            asyncio.create_task(send_startup_commands())

        # Create tasks for reading from PTY and WebSocket
        output_buffer = []  # 缓冲输出
        last_update_time = datetime.now()

        async def read_from_pty():
            """Read output from PTY and send to WebSocket"""
            nonlocal last_update_time
            print(f"[Terminal] read_from_pty started for session {session_id}, session.running={session.running}")
            while session.running:
                try:
                    data = await asyncio.get_event_loop().run_in_executor(
                        None, session.read, 0.1
                    )
                    if data:
                        # 保存到 session 的 scrollback buffer
                        session.save_output(data)

                        decoded_data = data.decode('utf-8', errors='ignore')
                        await websocket.send_text(decoded_data)

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
                    data = json.loads(message)

                    if data.get('type') == 'input':
                        input_data = data.get('data', '')
                        await asyncio.get_event_loop().run_in_executor(
                            None, session.write, input_data
                        )
                    elif data.get('type') == 'resize':
                        rows = data.get('rows', 24)
                        cols = data.get('cols', 80)
                        await asyncio.get_event_loop().run_in_executor(
                            None, session.resize, rows, cols
                        )
                except WebSocketDisconnect:
                    print(f"[Terminal] WebSocket disconnected in read_from_websocket for session {session_id}")
                    break
                except Exception as e:
                    print(f"[Terminal] Error reading from WebSocket: {e}")
                    import traceback
                    traceback.print_exc()
                    break
            print(f"[Terminal] read_from_websocket exited for session {session_id}")

        # Run both tasks concurrently
        print(f"[Terminal] Starting read tasks for session {session_id}...")
        results = await asyncio.gather(
            read_from_pty(),
            read_from_websocket(),
            return_exceptions=True
        )
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

                        # 如果进程已结束，更新状态
                        if not session.is_process_alive():
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
            "created_at": session.created_at.isoformat(),
            "last_activity": session.last_activity.isoformat(),
        })

    return JSONResponse({
        "available": True,
        "active_sessions_count": len(sessions),
        "active_sessions": active_sessions,
        "platform": os.name,
    })


@router.post("/sessions/{session_id}/close")
async def close_session(session_id: str):
    """手动关闭指定的 terminal session"""
    if session_id in sessions:
        session = sessions[session_id]
        session.close()
        del sessions[session_id]
        return JSONResponse({"success": True, "message": f"Session {session_id} closed"})
    else:
        return JSONResponse({"success": False, "message": f"Session {session_id} not found"}, status_code=404)

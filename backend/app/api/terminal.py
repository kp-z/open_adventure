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
from typing import Dict
from datetime import datetime, timedelta

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse

router = APIRouter()

# 超时配置：15 分钟（900 秒）
TERMINAL_TIMEOUT_SECONDS = int(os.getenv("TERMINAL_TIMEOUT_SECONDS", "900"))


class TerminalSession:
    """Manages a PTY terminal session"""

    def __init__(self):
        self.master_fd = None
        self.pid = None
        self.running = False
        self.last_activity = datetime.now()
        self.created_at = datetime.now()

    def start(self):
        """Start a new PTY session"""
        self.pid, self.master_fd = pty.fork()

        if self.pid == 0:
            # Child process - execute shell
            # Set HOME environment variable to ensure correct user context
            home_dir = os.path.expanduser('~')
            os.environ['HOME'] = home_dir

            # Change to user's home directory
            os.chdir(home_dir)

            # 取消 CLAUDECODE 环境变量，允许在 terminal 中使用 claude 命令
            if 'CLAUDECODE' in os.environ:
                del os.environ['CLAUDECODE']

            # Use zsh with login shell to load ~/.zshrc
            # Try zsh first, fall back to bash if not available
            shell = '/bin/zsh'
            if not os.path.exists(shell):
                shell = '/bin/bash'

            # -l: login shell (loads profile)
            # -i: interactive shell
            os.execvp(shell, [shell, '-l', '-i'])

        # Parent process
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

    def is_timeout(self) -> bool:
        """Check if session has timed out"""
        elapsed = (datetime.now() - self.last_activity).total_seconds()
        return elapsed > TERMINAL_TIMEOUT_SECONDS


# Store active sessions
sessions: Dict[str, TerminalSession] = {}

# 后台清理任务
cleanup_task = None


async def cleanup_inactive_sessions():
    """后台任务：定期清理超时的终端会话"""
    while True:
        try:
            await asyncio.sleep(60)  # 每分钟检查一次

            # 检查所有会话
            timeout_sessions = []
            for session_id, session in sessions.items():
                if session.is_timeout():
                    timeout_sessions.append(session_id)
                    print(f"Session {session_id} timed out after {TERMINAL_TIMEOUT_SECONDS}s of inactivity")

            # 关闭超时的会话
            for session_id in timeout_sessions:
                session = sessions.get(session_id)
                if session:
                    session.close()
                    del sessions[session_id]
                    print(f"Cleaned up session: {session_id}")

        except Exception as e:
            print(f"Error in cleanup task: {e}")


def start_cleanup_task():
    """启动后台清理任务"""
    global cleanup_task
    if cleanup_task is None:
        cleanup_task = asyncio.create_task(cleanup_inactive_sessions())
        print(f"Terminal cleanup task started (timeout: {TERMINAL_TIMEOUT_SECONDS}s)")


def stop_cleanup_task():
    """停止后台清理任务"""
    global cleanup_task
    if cleanup_task:
        cleanup_task.cancel()
        cleanup_task = None
        print("Terminal cleanup task stopped")


@router.websocket("/ws")
async def terminal_websocket(websocket: WebSocket):
    """WebSocket endpoint for terminal interaction"""
    await websocket.accept()

    # Create a new terminal session
    session = TerminalSession()
    session_id = str(id(websocket))
    sessions[session_id] = session

    try:
        # Start the PTY
        session.start()

        # Create tasks for reading from PTY and WebSocket
        async def read_from_pty():
            """Read output from PTY and send to WebSocket"""
            while session.running:
                try:
                    data = await asyncio.get_event_loop().run_in_executor(
                        None, session.read, 0.1
                    )
                    if data:
                        await websocket.send_text(data.decode('utf-8', errors='ignore'))
                except Exception as e:
                    print(f"Error reading from PTY: {e}")
                    break
                await asyncio.sleep(0.01)

        async def read_from_websocket():
            """Read input from WebSocket and write to PTY"""
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
                    break
                except Exception as e:
                    print(f"Error reading from WebSocket: {e}")
                    break

        # Run both tasks concurrently
        await asyncio.gather(
            read_from_pty(),
            read_from_websocket(),
            return_exceptions=True
        )

    except WebSocketDisconnect:
        print(f"WebSocket disconnected: {session_id}")
    except Exception as e:
        print(f"Terminal error: {e}")
    finally:
        # Clean up
        session.close()
        if session_id in sessions:
            del sessions[session_id]
        try:
            await websocket.close()
        except:
            pass


@router.get("/status")
async def terminal_status():
    """Get terminal service status"""
    return JSONResponse({
        "available": True,
        "active_sessions": len(sessions),
        "platform": os.name,
    })

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

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse

router = APIRouter()


class TerminalSession:
    """Manages a PTY terminal session"""

    def __init__(self):
        self.master_fd = None
        self.pid = None
        self.running = False

    def start(self):
        """Start a new PTY session"""
        self.pid, self.master_fd = pty.fork()

        if self.pid == 0:
            # Child process - execute shell
            # Set HOME environment variable to ensure correct user context
            home_dir = os.path.expanduser('~')
            os.environ['HOME'] = home_dir

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


# Store active sessions
sessions: Dict[str, TerminalSession] = {}


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

        # Send initial prompt
        await websocket.send_text("$ ")

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

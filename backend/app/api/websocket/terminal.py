"""
Terminal WebSocket handler for Agent testing
"""
import asyncio
import json
import os
import pty
import select
import struct
import fcntl
import termios
from typing import Optional
from datetime import datetime

from fastapi import WebSocket


class TerminalSession:
    """Manages a PTY terminal session for agent testing"""

    def __init__(self, agent_id: int, agent_name: str, agent_command: str):
        self.agent_id = agent_id
        self.agent_name = agent_name
        self.agent_command = agent_command
        self.master_fd: Optional[int] = None
        self.pid: Optional[int] = None
        self.running = False
        self.output_buffer = ""
        self.created_at = datetime.now()

    async def start(self, websocket: WebSocket):
        """启动 PTY 进程"""
        try:
            print(f"[AgentTerminal] Starting PTY for agent {self.agent_name}...")
            print(f"[AgentTerminal] Command: {self.agent_command}")

            self.pid, self.master_fd = pty.fork()

            if self.pid == 0:
                # Child process - execute agent command
                home_dir = os.path.expanduser('~')
                os.environ['HOME'] = home_dir
                os.chdir(home_dir)

                # 移除 CLAUDECODE 环境变量
                if 'CLAUDECODE' in os.environ:
                    del os.environ['CLAUDECODE']

                # 执行 agent 命令
                print(f"[AgentTerminal] Child process - Executing: {self.agent_command}")
                os.execvp('/bin/bash', ['/bin/bash', '-i'])

            # Parent process
            print(f"[AgentTerminal] PTY started with PID: {self.pid}, FD: {self.master_fd}")
            self.running = True

            # Set non-blocking mode
            flags = fcntl.fcntl(self.master_fd, fcntl.F_GETFL)
            fcntl.fcntl(self.master_fd, fcntl.F_SETFL, flags | os.O_NONBLOCK)

            # 发送就绪消息
            await websocket.send_json({
                'type': 'ready',
                'message': f'Agent session started'
            })
            print(f"[AgentTerminal] Sent ready message")

            # 启动输出读取任务
            asyncio.create_task(self._read_output(websocket))
            print(f"[AgentTerminal] Started output reading task")

        except Exception as e:
            print(f"[AgentTerminal] Error starting PTY: {e}")
            import traceback
            traceback.print_exc()
            await websocket.send_json({
                'type': 'error',
                'message': str(e)
            })

    async def _read_output(self, websocket: WebSocket):
        """读取 PTY 输出并发送到 WebSocket"""
        print(f"[AgentTerminal] Starting output reading loop...")
        try:
            while self.master_fd:
                try:
                    # Use select to check if data is available
                    ready, _, _ = select.select([self.master_fd], [], [], 0.1)
                    if ready:
                        data = os.read(self.master_fd, 1024)
                        if data:
                            decoded = data.decode('utf-8', errors='ignore')
                            self.output_buffer += decoded
                            print(f"[AgentTerminal] Read {len(data)} bytes: {decoded[:50]}...")
                            await websocket.send_json({
                                'type': 'output',
                                'data': decoded
                            })
                        else:
                            # EOF - process exited
                            print(f"[AgentTerminal] EOF detected, process exited")
                            self.running = False
                            break
                except OSError as e:
                    print(f"[AgentTerminal] PTY read error: {e}")
                    self.running = False
                    break

                await asyncio.sleep(0.01)

            # 进程结束
            print(f"[AgentTerminal] Output reading loop ended")
            exit_code = 0
            if self.pid:
                try:
                    _, status = os.waitpid(self.pid, os.WNOHANG)
                    exit_code = os.WEXITSTATUS(status) if os.WIFEXITED(status) else 1
                    print(f"[AgentTerminal] Process exit code: {exit_code}")
                except (OSError, ChildProcessError) as e:
                    print(f"[AgentTerminal] Error getting exit code: {e}")
                    exit_code = 1

            await websocket.send_json({
                'type': 'exit',
                'code': exit_code,
                'output': self.output_buffer
            })
            print(f"[AgentTerminal] Sent exit message")

        except Exception as e:
            print(f"[AgentTerminal] Error reading PTY output: {e}")
            import traceback
            traceback.print_exc()

    async def write_input(self, data: str):
        """写入用户输入到 PTY"""
        if self.master_fd and self.running:
            try:
                os.write(self.master_fd, data.encode('utf-8'))
            except OSError as e:
                print(f"[AgentTerminal] Error writing to PTY: {e}")
                self.running = False

    async def resize(self, cols: int, rows: int):
        """调整终端尺寸"""
        if self.master_fd and self.running:
            try:
                winsize = struct.pack('HHHH', rows, cols, 0, 0)
                fcntl.ioctl(self.master_fd, termios.TIOCSWINSZ, winsize)
            except OSError as e:
                print(f"[AgentTerminal] Error resizing PTY: {e}")

    def close(self):
        """关闭 PTY 进程"""
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

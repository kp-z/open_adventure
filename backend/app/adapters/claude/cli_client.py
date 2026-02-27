"""
Claude CLI Client

负责调用 Claude Code CLI 执行任务
"""
import asyncio
import json
import os
from typing import Dict, Any, Optional, List, Callable, AsyncIterator
from pathlib import Path
from datetime import datetime

from app.config.settings import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class ClaudeCliClient:
    """Claude CLI 客户端"""

    def __init__(self):
        self.cli_path = settings.claude_cli_path
        self.timeout = 300  # 默认 5 分钟超时

    async def execute_skill(
        self,
        skill_name: str,
        input_data: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        执行单个技能

        Args:
            skill_name: 技能名称
            input_data: 输入数据
            context: 执行上下文

        Returns:
            Dict: 执行结果
        """
        try:
            # 构建命令
            cmd = [
                self.cli_path,
                "skill",
                "run",
                skill_name,
                "--input",
                json.dumps(input_data)
            ]

            # 添加上下文参数
            if context:
                if "project_path" in context:
                    cmd.extend(["--project", context["project_path"]])

            logger.info(f"Executing skill: {skill_name}")
            result = await self._run_command(cmd, timeout=self.timeout)

            if result["success"]:
                return {
                    "success": True,
                    "output": result["output"],
                    "logs": result.get("stderr", ""),
                    "error": None
                }
            else:
                return {
                    "success": False,
                    "output": None,
                    "logs": result.get("stderr", ""),
                    "error": result["error"]
                }

        except Exception as e:
            logger.error(f"Error executing skill {skill_name}: {e}")
            return {
                "success": False,
                "output": None,
                "logs": "",
                "error": str(e)
            }

    async def execute_with_agent(
        self,
        agent_name: str,
        task_description: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        使用智能体执行任务

        Args:
            agent_name: 智能体名称
            task_description: 任务描述
            context: 执行上下文

        Returns:
            Dict: 执行结果
        """
        try:
            # 构建命令
            cmd = [
                self.cli_path,
                "agent",
                "run",
                agent_name,
                "--task",
                task_description
            ]

            # 添加上下文参数
            if context:
                if "project_path" in context:
                    cmd.extend(["--project", context["project_path"]])
                if "model" in context:
                    cmd.extend(["--model", context["model"]])

            logger.info(f"Executing with agent: {agent_name}")
            result = await self._run_command(cmd, timeout=self.timeout)

            if result["success"]:
                return {
                    "success": True,
                    "output": result["output"],
                    "logs": result.get("stderr", ""),
                    "error": None
                }
            else:
                return {
                    "success": False,
                    "output": None,
                    "logs": result.get("stderr", ""),
                    "error": result["error"]
                }

        except Exception as e:
            logger.error(f"Error executing with agent {agent_name}: {e}")
            return {
                "success": False,
                "output": None,
                "logs": "",
                "error": str(e)
            }

    async def execute_with_team(
        self,
        team_name: str,
        task_description: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        使用智能体队伍执行任务

        Args:
            team_name: 队伍名称
            task_description: 任务描述
            context: 执行上下文

        Returns:
            Dict: 执行结果
        """
        try:
            # 构建命令
            cmd = [
                self.cli_path,
                "team",
                "run",
                team_name,
                "--task",
                task_description
            ]

            # 添加上下文参数
            if context:
                if "project_path" in context:
                    cmd.extend(["--project", context["project_path"]])

            logger.info(f"Executing with team: {team_name}")
            result = await self._run_command(cmd, timeout=self.timeout)

            if result["success"]:
                return {
                    "success": True,
                    "output": result["output"],
                    "logs": result.get("stderr", ""),
                    "error": None
                }
            else:
                return {
                    "success": False,
                    "output": None,
                    "logs": result.get("stderr", ""),
                    "error": result["error"]
                }

        except Exception as e:
            logger.error(f"Error executing with team {team_name}: {e}")
            return {
                "success": False,
                "output": None,
                "logs": "",
                "error": str(e)
            }

    async def _run_command(
        self,
        cmd: List[str],
        timeout: int = 300
    ) -> Dict[str, Any]:
        """
        运行命令并返回结果

        Args:
            cmd: 命令列表
            timeout: 超时时间（秒）

        Returns:
            Dict: 包含 success, output, error, stderr
        """
        try:
            # 设置工作目录为用户 home 目录
            home_dir = os.path.expanduser('~')

            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=home_dir
            )

            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(),
                    timeout=timeout
                )

                return {
                    "success": process.returncode == 0,
                    "output": stdout.decode("utf-8") if stdout else "",
                    "error": stderr.decode("utf-8") if stderr and process.returncode != 0 else "",
                    "stderr": stderr.decode("utf-8") if stderr else "",
                    "returncode": process.returncode
                }

            except asyncio.TimeoutError:
                process.kill()
                await process.wait()
                return {
                    "success": False,
                    "output": "",
                    "error": f"Command timed out after {timeout} seconds",
                    "stderr": "",
                    "returncode": -1
                }

        except Exception as e:
            logger.error(f"Error running command {' '.join(cmd)}: {e}")
            return {
                "success": False,
                "output": "",
                "error": str(e),
                "stderr": "",
                "returncode": -1
            }

    async def run_command_with_streaming(
        self,
        cmd: List[str],
        log_callback: Optional[Callable[[str, str], None]] = None,
        timeout: int = 300,
        env: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        运行命令并实时输出日志

        Args:
            cmd: 命令列表
            log_callback: 日志回调函数，接收 (stream_type, line) 参数
                         stream_type 为 'stdout' 或 'stderr'
            timeout: 超时时间（秒）
            env: 自定义环境变量字典（可选）

        Returns:
            Dict: 包含 success, output, error, stderr, logs
        """
        start_time = datetime.now()
        stdout_lines = []
        stderr_lines = []

        try:
            # 记录开始执行
            if log_callback:
                log_callback("info", f"[{start_time.strftime('%H:%M:%S')}] 开始执行命令: {' '.join(cmd)}")

            # 设置工作目录为用户 home 目录
            home_dir = os.path.expanduser('~')

            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=env,
                cwd=home_dir
            )

            async def read_stream(stream, stream_type: str, lines_buffer: List[str]):
                """读取流并实时输出"""
                try:
                    while True:
                        line = await stream.readline()
                        if not line:
                            break

                        decoded_line = line.decode("utf-8").rstrip()
                        lines_buffer.append(decoded_line)

                        # 实时回调
                        if log_callback:
                            timestamp = datetime.now().strftime('%H:%M:%S')
                            log_callback(stream_type, f"[{timestamp}] {decoded_line}")

                except Exception as e:
                    logger.error(f"Error reading {stream_type}: {e}")

            # 并发读取 stdout 和 stderr
            try:
                await asyncio.wait_for(
                    asyncio.gather(
                        read_stream(process.stdout, "stdout", stdout_lines),
                        read_stream(process.stderr, "stderr", stderr_lines),
                        process.wait()
                    ),
                    timeout=timeout
                )
            except asyncio.TimeoutError:
                process.kill()
                await process.wait()
                if log_callback:
                    log_callback("error", f"命令执行超时（{timeout}秒）")

                return {
                    "success": False,
                    "output": "\n".join(stdout_lines),
                    "error": f"Command timed out after {timeout} seconds",
                    "stderr": "\n".join(stderr_lines),
                    "returncode": -1,
                    "logs": stdout_lines + stderr_lines,
                    "duration": (datetime.now() - start_time).total_seconds()
                }

            # 计算执行时长
            duration = (datetime.now() - start_time).total_seconds()

            # 记录完成状态
            if log_callback:
                status = "成功" if process.returncode == 0 else f"失败 (退出码: {process.returncode})"
                log_callback("info", f"命令执行{status}，耗时: {duration:.2f}秒")

            return {
                "success": process.returncode == 0,
                "output": "\n".join(stdout_lines),
                "error": "\n".join(stderr_lines) if process.returncode != 0 else "",
                "stderr": "\n".join(stderr_lines),
                "returncode": process.returncode,
                "logs": stdout_lines + stderr_lines,
                "duration": duration
            }

        except Exception as e:
            duration = (datetime.now() - start_time).total_seconds()
            logger.error(f"Error running command {' '.join(cmd)}: {e}")

            if log_callback:
                log_callback("error", f"执行异常: {str(e)}")

            return {
                "success": False,
                "output": "\n".join(stdout_lines),
                "error": str(e),
                "stderr": "\n".join(stderr_lines),
                "returncode": -1,
                "logs": stdout_lines + stderr_lines,
                "duration": duration
            }


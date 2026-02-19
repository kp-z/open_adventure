"""
Claude CLI Client

负责调用 Claude Code CLI 执行任务
"""
import asyncio
import json
from typing import Dict, Any, Optional, List
from pathlib import Path

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
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
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

"""
Claude Health Checker

检查 Claude Code CLI 环境的健康状态
"""
import asyncio
import subprocess
from pathlib import Path
from typing import Dict, Any, List

from app.config.settings import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class ClaudeHealthChecker:
    """Claude 环境健康检查器"""

    def __init__(self):
        self.cli_path = settings.claude_cli_path
        self.config_dir = settings.claude_config_dir
        self.skills_dir = settings.claude_skills_dir

    async def check_health(self) -> Dict[str, Any]:
        """
        检查 Claude 环境健康状态

        Returns:
            Dict: 健康状态信息
        """
        issues: List[str] = []
        version = None
        cli_available = False

        # 检查 CLI 是否可用
        try:
            result = await self._run_command([self.cli_path, "--version"])
            if result["success"]:
                cli_available = True
                version = result["output"].strip()
                logger.info(f"Claude CLI available: {version}")
            else:
                issues.append(f"Claude CLI not available: {result['error']}")
        except Exception as e:
            issues.append(f"Failed to check Claude CLI: {str(e)}")
            logger.error(f"Failed to check Claude CLI: {e}")

        # 检查配置目录
        config_dir_exists = self.config_dir.exists()
        if not config_dir_exists:
            issues.append(f"Config directory not found: {self.config_dir}")
            logger.warning(f"Config directory not found: {self.config_dir}")

        config_dir_readable = False
        if config_dir_exists:
            try:
                list(self.config_dir.iterdir())
                config_dir_readable = True
            except PermissionError:
                issues.append(f"Config directory not readable: {self.config_dir}")
                logger.error(f"Config directory not readable: {self.config_dir}")

        # 检查 skills 目录
        skills_dir_exists = self.skills_dir.exists()
        if not skills_dir_exists:
            issues.append(f"Skills directory not found: {self.skills_dir}")
            logger.warning(f"Skills directory not found: {self.skills_dir}")

        # 判断整体可用性
        available = cli_available and config_dir_exists and config_dir_readable

        return {
            "available": available,
            "cli_available": cli_available,
            "version": version,
            "config_path": str(self.config_dir),
            "config_dir_exists": config_dir_exists,
            "config_dir_readable": config_dir_readable,
            "skills_dir_exists": skills_dir_exists,
            "skills_path": str(self.skills_dir),
            "issues": issues
        }

    async def _run_command(self, cmd: List[str], timeout: int = 10) -> Dict[str, Any]:
        """
        运行命令并返回结果

        Args:
            cmd: 命令列表
            timeout: 超时时间（秒）

        Returns:
            Dict: 包含 success, output, error
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
                    "error": stderr.decode("utf-8") if stderr else "",
                    "returncode": process.returncode
                }
            except asyncio.TimeoutError:
                process.kill()
                await process.wait()
                return {
                    "success": False,
                    "output": "",
                    "error": f"Command timed out after {timeout} seconds",
                    "returncode": -1
                }

        except Exception as e:
            return {
                "success": False,
                "output": "",
                "error": str(e),
                "returncode": -1
            }

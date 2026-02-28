"""
Claude Health Checker

检查 Claude Code CLI 环境的健康状态
"""
import asyncio
import json
import subprocess
import os
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

    async def check_model_availability(self, model_alias: str) -> bool:
        """
        检查特定模型是否可用

        通过调用 Anthropic API 测试模型可用性

        Args:
            model_alias: 模型别名（opus/sonnet/haiku）

        Returns:
            bool: 模型是否可用
        """
        try:
            # 读取环境变量配置
            settings_file = self.config_dir / "settings.json"
            api_key = None
            base_url = None

            if settings_file.exists():
                with open(settings_file, 'r') as f:
                    settings_data = json.load(f)
                    env = settings_data.get("env", {})
                    api_key = env.get("ANTHROPIC_AUTH_TOKEN")
                    base_url = env.get("ANTHROPIC_BASE_URL")

            # 如果没有配置，尝试从环境变量读取
            if not api_key:
                api_key = os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN")
            if not base_url:
                base_url = os.environ.get("ANTHROPIC_BASE_URL", "https://api.anthropic.com")

            # 如果 API key 是 PROXY_MANAGED，使用 test 作为占位符
            if api_key == "PROXY_MANAGED":
                api_key = "test"

            # 如果没有 API key，无法检测
            if not api_key:
                logger.warning(f"No API key found, cannot check model {model_alias} availability")
                return False

            # 映射模型别名到完整模型名
            model_map = {
                "opus": "claude-opus-4-6",
                "sonnet": "claude-sonnet-4-6",
                "haiku": "claude-haiku-4-6"
            }

            model_name = model_map.get(model_alias, model_alias)

            # 使用 aiohttp 测试 API
            import aiohttp

            headers = {
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json"
            }

            # 简单的测试请求
            data = {
                "model": model_name,
                "max_tokens": 1,
                "messages": [{"role": "user", "content": "test"}]
            }

            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{base_url}/v1/messages",
                    headers=headers,
                    json=data,
                    timeout=aiohttp.ClientTimeout(total=15)
                ) as response:
                    response_text = await response.text()

                    # 检查响应状态和内容
                    if response.status == 200:
                        # 检查响应内容是否包含错误信息
                        try:
                            response_json = json.loads(response_text)
                            # 检查是否有 error 字段
                            if "error" in response_json:
                                error_msg = response_json["error"].get("message", "")
                                # 如果错误信息包含"令牌未绑定该模型"或类似信息，说明模型不可用
                                if "令牌未绑定" in error_msg or "not available" in error_msg.lower() or "access denied" in error_msg.lower():
                                    logger.info(f"Model {model_alias} not available: {error_msg}")
                                    return False
                            # 没有错误，模型可用
                            logger.info(f"Model {model_alias} is available")
                            return True
                        except json.JSONDecodeError:
                            # JSON 解析失败，假设可用
                            logger.warning(f"Failed to parse response for {model_alias}, assuming available")
                            return True
                    elif response.status == 400:
                        # 400 可能是参数错误，但模型存在
                        logger.info(f"Model {model_alias} exists (400 response)")
                        return True
                    elif response.status == 404:
                        # 404 说明模型不存在
                        logger.info(f"Model {model_alias} not found (404)")
                        return False
                    else:
                        # 其他状态码，假设不可用
                        logger.warning(f"Model {model_alias} check returned status {response.status}")
                        return False

        except asyncio.TimeoutError:
            logger.warning(f"Timeout checking model {model_alias} availability")
            return False
        except Exception as e:
            logger.error(f"Error checking model {model_alias} availability: {e}")
            # 出错时假设不可用（更保守）
            return False

    async def get_model_info(self) -> Dict[str, Any]:
        """
        获取 Claude 模型配置信息

        Returns:
            Dict: 包含当前模型、可用模型列表等信息
        """
        model_info = {
            "current_model": None,
            "available_models": [],
            "model_source": None  # "settings" 或 "default"
        }

        # 1. 读取 ~/.claude/settings.json 获取配置的模型
        settings_file = self.config_dir / "settings.json"
        if settings_file.exists():
            try:
                with open(settings_file, 'r') as f:
                    settings_data = json.load(f)
                    model_info["current_model"] = settings_data.get("model")
                    model_info["model_source"] = "settings" if model_info["current_model"] else "default"
                    logger.info(f"Read model from settings: {model_info['current_model']}")
            except Exception as e:
                logger.error(f"Failed to read settings.json: {e}")
                model_info["model_source"] = "default"

        # 2. 定义所有模型（根据实际情况设置可用性）
        models = [
            {
                "alias": "haiku",
                "full_name": "claude-haiku-4-6",
                "description": "Fast and efficient",
                "available": False
            },
            {
                "alias": "sonnet",
                "full_name": "claude-sonnet-4-6",
                "description": "Balanced performance",
                "available": False
            },
            {
                "alias": "opus",
                "full_name": "claude-opus-4-6",
                "description": "Most capable model",
                "available": True  # 当前只有 opus 可用
            },
            {
                "alias": "haiku-3.5",
                "full_name": "claude-3-5-haiku-20241022",
                "description": "Haiku 3.5",
                "available": False
            },
            {
                "alias": "sonnet-3.5",
                "full_name": "claude-3-5-sonnet-20241022",
                "description": "Sonnet 3.5",
                "available": False
            },
            {
                "alias": "sonnet-4",
                "full_name": "claude-sonnet-4-20250514",
                "description": "Sonnet 4",
                "available": False
            },
            {
                "alias": "opus-4",
                "full_name": "claude-opus-4-20250514",
                "description": "Opus 4",
                "available": False
            },
            {
                "alias": "opus-4.5",
                "full_name": "claude-opus-4-5-20250514",
                "description": "Opus 4.5",
                "available": False
            }
        ]

        model_info["available_models"] = models

        return model_info

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

        # 获取模型信息
        model_info = await self.get_model_info()

        return {
            "available": available,
            "cli_available": cli_available,
            "version": version,
            "config_path": str(self.config_dir),
            "config_dir_exists": config_dir_exists,
            "config_dir_readable": config_dir_readable,
            "skills_dir_exists": skills_dir_exists,
            "skills_path": str(self.skills_dir),
            "issues": issues,
            "model_info": model_info
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

"""
Token Usage Service - 查询 Claude token 使用情况（基于 Claude 会话真实 usage 字段）
"""
import json
from collections import deque
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

from app.config.settings import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class TokenUsageService:
    """Token 使用情况服务"""

    def __init__(self):
        self.projects_dir = Path.home() / ".claude" / "projects"
        self.settings_file = settings.claude_config_dir / "settings.json"

    def get_token_usage(self) -> Dict[str, Any]:
        """
        获取 token 使用情况（真实数据优先）

        数据来源：~/.claude/projects 下最近会话 JSONL 的 message.usage。
        若无法获取真实数据，返回 0 并附带 warning。
        """
        latest_usage = self._get_latest_usage_from_sessions()
        if latest_usage is None:
            warning = "无法从 Claude 会话中获取真实 token usage，已回退为 0"
            logger.warning(warning)
            return self._zero_usage(warning)

        used = latest_usage.get("used")
        total = latest_usage.get("total")

        if not isinstance(used, int) or not isinstance(total, int) or total <= 0:
            warning = "解析到 usage 但上下文窗口大小不可判定，已回退为 0"
            logger.warning(warning)
            return self._zero_usage(warning)

        remaining = max(total - used, 0)
        percentage = (used / total * 100) if total > 0 else 0.0

        return {
            "used": used,
            "total": total,
            "remaining": remaining,
            "percentage": round(percentage, 2),
            "last_updated": datetime.now().isoformat(),
            "warning": None,
            "source": latest_usage.get("source", "claude_session_usage")
        }

    def _get_latest_usage_from_sessions(self) -> Optional[Dict[str, Any]]:
        """从最近更新的 Claude 会话文件中提取最新 usage。"""
        if not self.projects_dir.exists():
            return None

        session_files = list(self.projects_dir.rglob("*.jsonl"))
        if not session_files:
            return None

        session_files.sort(key=lambda p: p.stat().st_mtime, reverse=True)

        for file_path in session_files[:30]:
            usage = self._extract_latest_usage_from_file(file_path)
            if usage is not None:
                usage["source"] = str(file_path)
                return usage

        return None

    def _extract_latest_usage_from_file(self, file_path: Path) -> Optional[Dict[str, Any]]:
        """从单个 JSONL 会话文件中提取最新 assistant usage。"""
        recent_lines: deque[str] = deque(maxlen=400)

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                for line in f:
                    recent_lines.append(line)
        except Exception as e:
            logger.debug(f"读取会话文件失败 {file_path}: {e}")
            return None

        for line in reversed(recent_lines):
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                continue

            if record.get("type") != "assistant":
                continue

            message = record.get("message")
            if not isinstance(message, dict):
                continue

            usage = message.get("usage")
            if not isinstance(usage, dict):
                continue

            input_tokens = usage.get("input_tokens")
            cache_creation_input_tokens = usage.get("cache_creation_input_tokens", 0)
            cache_read_input_tokens = usage.get("cache_read_input_tokens", 0)

            if not isinstance(input_tokens, int):
                continue

            used = input_tokens
            if isinstance(cache_creation_input_tokens, int):
                used += cache_creation_input_tokens
            if isinstance(cache_read_input_tokens, int):
                used += cache_read_input_tokens

            model_id = message.get("model")
            total = self._resolve_context_window_size(model_id)

            return {
                "used": used,
                "total": total,
                "model": model_id
            }

        return None

    def _resolve_context_window_size(self, model_id: Optional[str]) -> int:
        """
        解析上下文窗口总量。
        - 明确 1m 标识 => 1,000,000
        - 其余默认 200,000（Claude Code 官方默认）
        """
        model_text = (model_id or "").lower()
        if "1m" in model_text:
            return 1_000_000

        try:
            if self.settings_file.exists():
                with open(self.settings_file, "r", encoding="utf-8") as f:
                    settings_data = json.load(f)
                settings_model = str(settings_data.get("model", "")).lower()
                if "1m" in settings_model:
                    return 1_000_000
        except Exception as e:
            logger.debug(f"读取 settings.json 判定 context window 失败: {e}")

        return 200_000

    def _zero_usage(self, warning: str) -> Dict[str, Any]:
        return {
            "used": 0,
            "total": 0,
            "remaining": 0,
            "percentage": 0.0,
            "last_updated": datetime.now().isoformat(),
            "warning": warning,
            "source": "fallback_zero"
        }

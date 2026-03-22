"""Application settings and configuration."""
from __future__ import annotations

from pathlib import Path
from typing import List, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Application
    app_name: str = "Open Adventure"
    app_version: str = "0.2.0"
    debug: bool = False
    env: str = "development"  # development, production, test

    # API
    api_prefix: str = "/api"

    # Security
    secret_key: str = "your-secret-key-here-change-in-production"
    access_token_expire_minutes: int = 30

    # Internet access password (empty = disabled, set via ACCESS_PASSWORD env var)
    access_password: str = ""

    @property
    def internet_access_enabled(self) -> bool:
        return bool(self.access_password)

    # Database
    database_url: str = "sqlite+aiosqlite:///./open_adventure.db"

    # Claude Configuration
    anthropic_api_key: Optional[str] = None
    claude_cli_path: str = "claude"
    claude_config_dir: Path = Path.home() / ".claude"
    claude_skills_dir: Path = Path.home() / ".claude" / "skills"
    claude_plugins_dir: Path = Path.home() / ".claude" / "plugins"

    # Model Provider Configuration
    default_model_provider: str = "anthropic"  # 默认使用 Anthropic API
    openai_api_key: Optional[str] = None  # 未来扩展用

    # 项目路径配置（用于扫描项目级 agents）
    # 可以通过环境变量 PROJECT_PATH 设置
    project_path: Optional[str] = None

    # Logging
    log_level: str = "INFO"
    log_format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

    # CORS - 允许多个端口以支持不同的开发环境
    cors_origins: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",  # Vite 默认端口
        "http://127.0.0.1:5173",
        "http://localhost:5174",  # Vite 备用端口
        "http://127.0.0.1:5174",
        "http://localhost:5175",  # Vite 备用端口
        "http://127.0.0.1:5175",
    ]
    # 可通过环境变量 CORS_ORIGIN_REGEX 覆盖自动规则
    cors_origin_regex: Optional[str] = None

    def get_effective_cors_origin_regex(self) -> Optional[str]:
        """Return effective CORS origin regex.

        Priority:
        1. Use explicit CORS_ORIGIN_REGEX when provided.
        2. In non-production env, auto-allow localhost + common private LAN ranges.
        3. In production, keep strict origin list only (unless explicitly configured).
        """
        if self.cors_origin_regex:
            return self.cors_origin_regex

        if self.env.lower() in {"development", "dev", "test"}:
            return (
                r"^https?://"
                r"(localhost|127\.0\.0\.1"
                r"|10(?:\.\d{1,3}){3}"
                r"|192\.168(?:\.\d{1,3}){2}"
                r"|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})"
                r"(?::\d{1,5})?$"
            )

        return None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # 忽略未定义的环境变量
    )


# Global settings instance
settings = Settings()

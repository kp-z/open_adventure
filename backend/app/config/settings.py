"""Application settings and configuration."""
import os
from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Application
    app_name: str = "Claude Manager"
    app_version: str = "0.2.0"
    debug: bool = False

    # API
    api_prefix: str = "/api"

    # Security
    secret_key: str = "your-secret-key-here-change-in-production"
    access_token_expire_minutes: int = 30

    # Database
    database_url: str = "sqlite+aiosqlite:///./claude_manager.db"

    # Claude Configuration
    anthropic_api_key: Optional[str] = None
    claude_cli_path: str = "claude"
    claude_config_dir: Path = Path.home() / ".claude"
    claude_skills_dir: Path = Path.home() / ".claude" / "skills"
    claude_plugins_dir: Path = Path.home() / ".claude" / "plugins"

    # Logging
    log_level: str = "INFO"
    log_format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

    # CORS
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",  # Vite 默认端口
        "http://127.0.0.1:5173",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


# Global settings instance
settings = Settings()

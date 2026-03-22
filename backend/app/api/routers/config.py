"""
Configuration Management API Router

提供配置文件读取和更新的 API 端点
"""
from pathlib import Path
from typing import Dict, Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
import json

router = APIRouter(prefix="/config", tags=["config"])


class ConfigUpdate(BaseModel):
    """配置更新模型"""
    APP_NAME: Optional[str] = None
    APP_VERSION: Optional[str] = None
    DEBUG: Optional[str] = None
    ENV: Optional[str] = None
    API_PREFIX: Optional[str] = None
    SECRET_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    CLAUDE_CLI_PATH: Optional[str] = None
    DEFAULT_MODEL_PROVIDER: Optional[str] = None
    LOG_LEVEL: Optional[str] = None
    CORS_ORIGIN_REGEX: Optional[str] = None


class ModelConfig(BaseModel):
    """模型配置"""
    alias: str
    full_name: str
    description: str


class ModelsConfigUpdate(BaseModel):
    """模型列表更新"""
    models: List[ModelConfig]


def get_config_file_path() -> Path:
    """获取配置文件路径"""
    from app.core.path_resolver import get_env_path
    return get_env_path()


def parse_env_file(file_path: Path) -> Dict[str, str]:
    """解析 .env 文件"""
    config = {}

    if not file_path.exists():
        return config

    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            # 跳过注释和空行
            if not line or line.startswith('#'):
                continue

            # 解析 KEY=VALUE
            if '=' in line:
                key, value = line.split('=', 1)
                config[key.strip()] = value.strip()

    return config


def write_env_file(file_path: Path, config: Dict[str, str]):
    """写入 .env 文件（保留注释和格式）"""
    # 读取原文件内容（保留注释）
    lines = []
    if file_path.exists():
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()

    # 更新配置值
    updated_lines = []
    updated_keys = set()

    for line in lines:
        stripped = line.strip()

        # 保留注释和空行
        if not stripped or stripped.startswith('#'):
            updated_lines.append(line)
            continue

        # 更新配置项
        if '=' in stripped:
            key = stripped.split('=', 1)[0].strip()
            if key in config:
                updated_lines.append(f"{key}={config[key]}\n")
                updated_keys.add(key)
            else:
                updated_lines.append(line)
        else:
            updated_lines.append(line)

    # 添加新的配置项（不在原文件中的）
    for key, value in config.items():
        if key not in updated_keys:
            updated_lines.append(f"\n# 新增配置\n{key}={value}\n")

    # 写回文件
    file_path.parent.mkdir(parents=True, exist_ok=True)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(updated_lines)


@router.get("")
async def get_config():
    """
    获取当前配置

    Returns:
        Dict: 配置键值对
    """
    config_file = get_config_file_path()

    if not config_file.exists():
        raise HTTPException(status_code=404, detail="配置文件不存在")

    config = parse_env_file(config_file)

    # 隐藏敏感信息
    if 'SECRET_KEY' in config and config['SECRET_KEY']:
        config['SECRET_KEY'] = '***hidden***'
    if 'ANTHROPIC_API_KEY' in config and config['ANTHROPIC_API_KEY']:
        config['ANTHROPIC_API_KEY'] = '***hidden***'

    return {
        "config": config,
        "config_file": str(config_file)
    }


@router.put("")
async def update_config(update: ConfigUpdate):
    """
    更新配置

    Args:
        update: 要更新的配置项（只更新提供的字段）

    Returns:
        Dict: 更新后的配置
    """
    config_file = get_config_file_path()

    # 读取现有配置
    current_config = parse_env_file(config_file) if config_file.exists() else {}

    # 更新提供的字段
    update_dict = update.model_dump(exclude_none=True)
    for key, value in update_dict.items():
        current_config[key] = value

    # 写回文件
    try:
        write_env_file(config_file, current_config)

        # 重新读取并返回（隐藏敏感信息）
        updated_config = parse_env_file(config_file)
        if 'SECRET_KEY' in updated_config and updated_config['SECRET_KEY']:
            updated_config['SECRET_KEY'] = '***hidden***'
        if 'ANTHROPIC_API_KEY' in updated_config and updated_config['ANTHROPIC_API_KEY']:
            updated_config['ANTHROPIC_API_KEY'] = '***hidden***'

        return {
            "success": True,
            "config": updated_config,
            "config_file": str(config_file)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新配置失败: {str(e)}")


@router.post("/reset")
async def reset_config():
    """
    重置配置为默认值

    Returns:
        Dict: 重置后的配置
    """
    config_file = get_config_file_path()

    # 默认配置
    default_config = {
        "APP_NAME": "Open Adventure",
        "APP_VERSION": "0.2.0",
        "DEBUG": "false",
        "ENV": "production",
        "API_PREFIX": "/api",
        "SECRET_KEY": "change-this-to-a-random-secret-key-in-production",
        "CLAUDE_CLI_PATH": "claude",
        "DEFAULT_MODEL_PROVIDER": "anthropic",
        "LOG_LEVEL": "INFO"
    }

    try:
        # 创建默认配置文件
        config_file.parent.mkdir(parents=True, exist_ok=True)
        with open(config_file, 'w', encoding='utf-8') as f:
            f.write("""# Open Adventure Configuration
# 应用配置
APP_NAME=Open Adventure
APP_VERSION=0.2.0
DEBUG=false
ENV=production

# API 配置
API_PREFIX=/api

# 安全配置（请修改为随机字符串）
SECRET_KEY=change-this-to-a-random-secret-key-in-production

# 数据库配置（自动设置）
# DATABASE_URL=sqlite+aiosqlite:///~/.open_adventure/open_adventure.db

# Claude 配置
# ANTHROPIC_API_KEY=your-api-key-here
CLAUDE_CLI_PATH=claude

# 模型提供商配置
DEFAULT_MODEL_PROVIDER=anthropic

# 日志配置
LOG_LEVEL=INFO

# CORS 配置（生产环境）
# CORS_ORIGIN_REGEX=^https?://(localhost|127\\.0\\.0\\.1)(?::\\d{1,5})?$
""")

        return {
            "success": True,
            "message": "配置已重置为默认值",
            "config_file": str(config_file)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"重置配置失败: {str(e)}")


def get_models_config_path() -> Path:
    """获取自定义模型配置文件路径"""
    from app.config.settings import settings

    # 使用 Claude 配置目录的 custom_models.json
    if settings.claude_config_dir:
        return settings.claude_config_dir / "custom_models.json"

    # 如果没有配置目录，使用用户目录
    user_dir = Path.home() / ".claude"
    user_dir.mkdir(parents=True, exist_ok=True)
    return user_dir / "custom_models.json"


def get_default_models_path() -> Path:
    """获取默认模型配置文件路径"""
    from app.core.path_resolver import get_config_path
    return get_config_path("default_models.json")


@router.get("/models")
async def get_models_config():
    """
    获取模型配置列表（默认 + 自定义）

    Returns:
        Dict: 模型配置列表
    """
    default_models = []
    custom_models = []

    # 读取默认模型
    default_file = get_default_models_path()
    if default_file.exists():
        try:
            with open(default_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                default_models = data.get("models", [])
        except Exception as e:
            pass

    # 读取自定义模型
    custom_file = get_models_config_path()
    if custom_file.exists():
        try:
            with open(custom_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                custom_models = data.get("models", [])
        except Exception as e:
            pass

    return {
        "default_models": default_models,
        "custom_models": custom_models,
        "default_file": str(default_file),
        "custom_file": str(custom_file)
    }


@router.put("/models")
async def update_models_config(update: ModelsConfigUpdate):
    """
    更新自定义模型配置列表

    Args:
        update: 自定义模型配置列表

    Returns:
        Dict: 更新结果
    """
    custom_file = get_models_config_path()

    try:
        # 确保目录存在
        custom_file.parent.mkdir(parents=True, exist_ok=True)

        # 转换为字典格式
        models_data = {
            "models": [model.model_dump() for model in update.models]
        }

        # 写入文件
        with open(custom_file, 'w', encoding='utf-8') as f:
            json.dump(models_data, f, indent=2, ensure_ascii=False)

        return {
            "success": True,
            "message": "自定义模型配置已更新",
            "custom_models": models_data["models"],
            "custom_file": str(custom_file)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新模型配置失败: {str(e)}")


@router.post("/models/reset")
async def reset_models_config():
    """
    清空自定义模型配置

    Returns:
        Dict: 重置结果
    """
    custom_file = get_models_config_path()

    try:
        # 删除自定义模型文件
        if custom_file.exists():
            custom_file.unlink()

        return {
            "success": True,
            "message": "自定义模型配置已清空",
            "custom_file": str(custom_file)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"重置模型配置失败: {str(e)}")

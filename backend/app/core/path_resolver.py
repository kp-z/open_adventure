"""
路径解析器 - 统一处理开发环境与 PyInstaller 打包环境的路径差异

打包环境中 Path(__file__) 指向 sys._MEIPASS 临时目录，
所有需要定位资源文件的地方都应通过本模块获取路径。
"""
import sys
from pathlib import Path


def is_packaged() -> bool:
    """判断是否在 PyInstaller 打包环境中运行"""
    return getattr(sys, 'frozen', False)


def get_user_home() -> Path:
    """获取用户数据目录 ~/.open_adventure/"""
    home = Path.home() / ".open_adventure"
    home.mkdir(parents=True, exist_ok=True)
    return home


def get_base_dir() -> Path:
    """
    获取基础目录（backend/ 级别）
    - 打包环境: sys._MEIPASS（临时解压目录）
    - 开发环境: backend/ 目录
    """
    if is_packaged():
        return Path(sys._MEIPASS)
    return Path(__file__).resolve().parent.parent.parent


def get_project_root() -> Path:
    """
    获取项目根目录
    - 打包环境: ~/.open_adventure/（用户持久化目录）
    - 开发环境: 项目根目录（backend/ 的父目录）
    """
    if is_packaged():
        return get_user_home()
    base = get_base_dir()
    return base.parent if base.name == 'backend' else base


def get_config_path(filename: str) -> Path:
    """
    获取配置文件路径（app/config/ 下的文件）
    - 打包环境: _MEIPASS/app/config/{filename}
    - 开发环境: backend/app/config/{filename}
    """
    return get_base_dir() / "app" / "config" / filename


def get_alembic_ini() -> Path:
    """
    获取 alembic.ini 路径
    - 打包环境: _MEIPASS/alembic.ini
    - 开发环境: backend/alembic.ini
    """
    return get_base_dir() / "alembic.ini"


def get_alembic_dir() -> Path:
    """
    获取 alembic 目录路径
    - 打包环境: _MEIPASS/alembic/
    - 开发环境: backend/alembic/
    """
    return get_base_dir() / "alembic"


def get_plans_dir() -> Path:
    """
    获取 Plan 文件存储目录
    - 打包环境: ~/.open_adventure/plans/
    - 开发环境: {project_root}/.cursor/plans/agent-plans/
    """
    if is_packaged():
        plans = get_user_home() / "plans"
    else:
        plans = get_project_root() / ".cursor" / "plans" / "agent-plans"
    plans.mkdir(parents=True, exist_ok=True)
    return plans


def get_marketplace_dir() -> Path:
    """
    获取 marketplace 目录
    - 打包环境: ~/.open_adventure/marketplace/（从 _MEIPASS 复制）
    - 开发环境: {project_root}/marketplace/
    """
    if is_packaged():
        return get_user_home() / "marketplace"
    return get_project_root() / "marketplace"


def get_thumbnails_dir() -> Path:
    """
    获取缩略图存储目录
    - 始终使用 ~/.open_adventure/thumbnails/（持久化）
    """
    thumbnails = get_user_home() / "thumbnails"
    thumbnails.mkdir(parents=True, exist_ok=True)
    return thumbnails


def get_test_config_path() -> Path:
    """
    获取测试配置文件路径
    - 打包环境: _MEIPASS/app/testing/test_config.yaml
    - 开发环境: backend/app/testing/test_config.yaml
    """
    return get_base_dir() / "app" / "testing" / "test_config.yaml"


def get_env_path() -> Path:
    """
    获取 .env 配置文件路径（优先用户目录）
    - 优先: ~/.open_adventure/.env
    - 回退（开发环境）: {project_root}/.env
    """
    user_env = get_user_home() / ".env"
    if user_env.exists():
        return user_env
    if not is_packaged():
        dev_env = get_project_root() / ".env"
        if dev_env.exists():
            return dev_env
    return user_env  # 返回用户目录路径（后续会创建）

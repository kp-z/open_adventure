"""
数据库自动迁移模块

在应用启动时自动执行 Alembic 迁移，确保数据库 schema 与代码版本一致。
"""
import logging
from pathlib import Path
from typing import Optional
from alembic import command
from alembic.config import Config
from alembic.script import ScriptDirectory
from alembic.runtime.migration import MigrationContext
from sqlalchemy import create_engine

logger = logging.getLogger(__name__)


def get_alembic_config() -> Config:
    """获取 Alembic 配置对象"""
    from app.core.path_resolver import get_alembic_ini, get_alembic_dir

    alembic_ini = get_alembic_ini()

    if not alembic_ini.exists():
        raise FileNotFoundError(f"Alembic config not found: {alembic_ini}")

    config = Config(str(alembic_ini))
    # 设置 script_location 为绝对路径
    config.set_main_option("script_location", str(get_alembic_dir()))

    return config


def get_current_revision(database_url: str) -> Optional[str]:
    """获取当前数据库的迁移版本"""
    try:
        engine = create_engine(database_url)
        with engine.connect() as conn:
            context = MigrationContext.configure(conn)
            current_rev = context.get_current_revision()
            return current_rev
    except Exception as e:
        logger.warning(f"Failed to get current revision: {e}")
        return None


def get_head_revision() -> str:
    """获取代码中的最新迁移版本"""
    config = get_alembic_config()
    script = ScriptDirectory.from_config(config)
    head_rev = script.get_current_head()
    return head_rev


def needs_migration(database_url: str) -> bool:
    """检查是否需要执行迁移"""
    try:
        current = get_current_revision(database_url)
        head = get_head_revision()

        if current is None:
            # 数据库未初始化或没有 alembic_version 表
            logger.info("Database not initialized or no migration history found")
            return True

        if current != head:
            logger.info(f"Migration needed: current={current}, head={head}")
            return True

        logger.info(f"Database is up to date: {current}")
        return False
    except Exception as e:
        logger.error(f"Error checking migration status: {e}")
        # 出错时保守处理，尝试执行迁移
        return True


def run_migrations(database_url: str) -> bool:
    """
    执行数据库迁移

    Returns:
        bool: 迁移是否成功
    """
    try:
        logger.info("Starting database migration...")

        config = get_alembic_config()

        # 设置数据库 URL（确保使用同步 URL）
        sync_url = database_url.replace("sqlite+aiosqlite://", "sqlite://")
        config.set_main_option("sqlalchemy.url", sync_url)

        # 临时修改 settings 中的数据库 URL
        # 这样 env.py 导入 database.py 时不会出错
        from app.config.settings import settings as app_settings
        old_db_url = app_settings.database_url

        try:
            # 设置为同步 URL
            app_settings.database_url = sync_url

            # 执行迁移到最新版本
            command.upgrade(config, "head")

        finally:
            # 恢复原来的 URL
            app_settings.database_url = old_db_url

        logger.info("✅ Database migration completed successfully")
        return True

    except Exception as e:
        logger.error(f"❌ Database migration failed: {e}", exc_info=True)
        return False


def auto_migrate(database_url: str) -> bool:
    """
    自动迁移：检查并执行必要的数据库迁移

    Args:
        database_url: 数据库连接 URL

    Returns:
        bool: 是否成功（如果不需要迁移也返回 True）
    """
    try:
        logger.info("Checking database migration status...")

        if not needs_migration(database_url):
            logger.info("No migration needed")
            return True

        logger.info("Migration required, starting auto-migration...")
        return run_migrations(database_url)

    except Exception as e:
        logger.error(f"Auto-migration failed: {e}", exc_info=True)
        return False

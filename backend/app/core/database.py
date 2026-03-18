"""Database configuration and session management."""
import os
from typing import AsyncGenerator

from sqlalchemy import MetaData, pool
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.config.settings import settings

# Naming convention for constraints
convention = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}

metadata = MetaData(naming_convention=convention)


class Base(DeclarativeBase):
    """Base class for all database models."""

    metadata = metadata


# 检查是否在 Alembic 迁移模式下
# 在迁移模式下，不创建 async engine（避免同步/异步冲突）
if os.environ.get("ALEMBIC_MIGRATION_MODE") != "1":
    # 根据数据库类型配置引擎参数
    engine_kwargs = {
        "echo": settings.debug,
        "future": True,
    }

    # SQLite 不支持连接池参数，使用 NullPool
    if settings.database_url.startswith("sqlite"):
        engine_kwargs["poolclass"] = pool.NullPool
    else:
        # 其他数据库（PostgreSQL, MySQL 等）使用连接池
        engine_kwargs.update({
            "pool_size": 20,           # 增加连接池大小（默认 5）
            "max_overflow": 40,        # 增加溢出连接数（默认 10）
            "pool_recycle": 3600,      # 1小时回收连接，防止连接过期
            "pool_pre_ping": True,     # 连接前检查可用性，防止使用失效连接
        })

    # Create async engine with optimized settings
    engine = create_async_engine(settings.database_url, **engine_kwargs)

    # Create async session factory
    AsyncSessionLocal = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )
else:
    # 迁移模式下，不创建 engine 和 session factory
    engine = None
    AsyncSessionLocal = None


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency to get database session.

    Yields:
        Database session
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """Initialize database tables and run migrations."""
    # 先执行自动迁移
    from app.database.migration import auto_migrate
    import logging

    logger = logging.getLogger(__name__)

    # 将异步数据库 URL 转换为同步 URL（Alembic 需要同步连接）
    sync_db_url = settings.database_url.replace("+aiosqlite", "")

    logger.info("Running auto-migration...")
    migration_success = auto_migrate(sync_db_url)

    if not migration_success:
        logger.warning("⚠️  Auto-migration failed, falling back to create_all()")
        logger.warning("This may cause issues if schema changes are required")

    # 确保所有表都存在（兜底机制）
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db() -> None:
    """Close database connections."""
    await engine.dispose()


async def get_connection_pool_status() -> dict:
    """获取数据库连接池状态信息"""
    pool = engine.pool
    pool_class_name = type(pool).__name__

    if pool_class_name == "NullPool":
        return {
            "type": "NullPool",
            "description": "SQLite 使用 NullPool（无连接池）",
            "checked_out": 0,
            "size": 0,
        }
    else:
        # 其他数据库的连接池状态
        try:
            return {
                "type": pool_class_name,
                "size": pool.size(),
                "checked_in": pool.checkedin(),
                "checked_out": pool.checkedout(),
                "overflow": pool.overflow(),
                "invalid": pool.invalid(),
            }
        except Exception as e:
            return {
                "type": pool_class_name,
                "error": f"无法获取连接池状态: {str(e)}",
                "checked_out": 0,
                "size": 0,
            }

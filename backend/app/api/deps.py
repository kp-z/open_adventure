"""
API 依赖注入
"""
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.adapters.claude.adapter import ClaudeAdapter


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    获取数据库会话

    Yields:
        AsyncSession: 数据库会话
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def get_claude_adapter() -> ClaudeAdapter:
    """
    获取 Claude 适配器

    Returns:
        ClaudeAdapter: Claude 适配器实例
    """
    return ClaudeAdapter()

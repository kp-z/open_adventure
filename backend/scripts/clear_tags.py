"""
清空所有 Skills 的标签
"""
import asyncio
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import get_db
from app.repositories.skill_repository import SkillRepository
from app.schemas.skill import SkillUpdate
from app.core.logging import get_logger

logger = get_logger(__name__)


async def clear_all_tags():
    """清空所有 Skills 的标签"""
    logger.info("开始清空所有 Skills 的标签...")

    async for db in get_db():
        repo = SkillRepository(db)

        # 获取所有 Skills（返回元组 (skills, total)）
        skills, total = await repo.get_all()
        logger.info(f"找到 {total} 个 Skills")

        cleared_count = 0

        for skill in skills:
            if skill.tags:
                # 清空标签
                skill_update = SkillUpdate(tags=[])
                await repo.update(skill.id, skill_update)
                logger.info(f"清空 {skill.name} 的标签")
                cleared_count += 1

        logger.info(f"清空完成：{cleared_count} 个 Skills 的标签已清空")
        break  # 只处理第一个数据库会话


if __name__ == "__main__":
    asyncio.run(clear_all_tags())

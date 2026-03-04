"""
标签迁移脚本
将现有的 category: 标签迁移到新的多维度标签体系
"""
import asyncio
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import get_db
from app.repositories.skill_repository import SkillRepository
from app.services.tag_classifier import TagClassifier
from app.core.logging import get_logger

logger = get_logger(__name__)


async def migrate_tags():
    """迁移标签"""
    logger.info("开始迁移标签...")

    async for db in get_db():
        repo = SkillRepository(db)
        classifier = TagClassifier()

        # 获取所有 Skills
        skills = await repo.get_all()
        logger.info(f"找到 {len(skills)} 个 Skills")

        migrated_count = 0
        skipped_count = 0

        for skill in skills:
            # 检查是否有旧的 category: 标签
            old_tags = [tag for tag in (skill.tags or []) if tag.startswith("category:")]

            if not old_tags and skill.tags:
                # 如果没有旧标签但有其他标签，跳过
                logger.debug(f"跳过 {skill.name}：已有新标签")
                skipped_count += 1
                continue

            # 使用分类器推荐新标签
            suggested_tags = classifier.suggest_tags({
                "name": skill.name,
                "description": skill.description or "",
                "meta": skill.meta or {}
            })

            # 保留非 category: 标签
            non_category_tags = [tag for tag in (skill.tags or []) if not tag.startswith("category:")]

            # 合并新旧标签
            new_tags = list(set(non_category_tags + suggested_tags))[:10]  # 去重并限制数量

            # 更新标签
            if new_tags != skill.tags:
                skill.tags = new_tags
                await repo.update(skill.id, {"tags": skill.tags})
                logger.info(f"迁移 {skill.name}：{old_tags} -> {suggested_tags}")
                migrated_count += 1
            else:
                skipped_count += 1

        logger.info(f"迁移完成：{migrated_count} 个 Skills 已更新，{skipped_count} 个跳过")
        break  # 只处理第一个数据库会话


if __name__ == "__main__":
    asyncio.run(migrate_tags())

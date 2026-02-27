"""
清理数据库中重复的 Agent 记录

保留每个 name+scope 组合中 ID 最小的记录，删除其他重复记录
"""
import asyncio
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal
from app.models.agent import Agent
from app.core.logging import get_logger

logger = get_logger(__name__)


async def clean_duplicate_agents():
    """清理重复的 Agent 记录"""
    async with AsyncSessionLocal() as session:
        try:
            # 获取所有 agents
            result = await session.execute(select(Agent))
            all_agents = list(result.scalars().all())

            logger.info(f"Total agents in database: {len(all_agents)}")

            # 按 name+scope 分组
            from collections import defaultdict
            groups = defaultdict(list)
            for agent in all_agents:
                key = (agent.name, agent.scope)
                groups[key].append(agent)

            # 找出重复的组
            duplicates = {k: v for k, v in groups.items() if len(v) > 1}

            if not duplicates:
                logger.info("No duplicate agents found")
                return

            logger.info(f"Found {len(duplicates)} groups with duplicates:")

            deleted_count = 0
            for (name, scope), agents in duplicates.items():
                # 按 ID 排序，保留最小的
                agents.sort(key=lambda a: a.id)
                keep = agents[0]
                to_delete = agents[1:]

                logger.info(f"\n{name} ({scope}): {len(agents)} records")
                logger.info(f"  Keeping: ID={keep.id}")
                logger.info(f"  Deleting: {[a.id for a in to_delete]}")

                # 删除重复记录
                for agent in to_delete:
                    await session.delete(agent)
                    deleted_count += 1

            # 提交更改
            await session.commit()
            logger.info(f"\nDeleted {deleted_count} duplicate agents")

        except Exception as e:
            logger.error(f"Error cleaning duplicates: {e}")
            await session.rollback()
            raise


if __name__ == "__main__":
    asyncio.run(clean_duplicate_agents())

"""
Agent Repository - Claude Code Subagent 数据访问层
"""
from typing import Optional, List, Dict, Any
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import Agent
from app.schemas.agent import AgentCreate, AgentUpdate


class AgentRepository:
    """Repository for Agent CRUD operations"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, agent_data: AgentCreate) -> Agent:
        """创建新的子代理"""
        agent = Agent(**agent_data.model_dump())
        self.session.add(agent)
        await self.session.commit()
        await self.session.refresh(agent)
        return agent

    async def get_by_id(self, agent_id: int) -> Optional[Agent]:
        """通过 ID 获取子代理"""
        result = await self.session.execute(
            select(Agent).where(Agent.id == agent_id)
        )
        return result.scalar_one_or_none()

    async def get_by_name(self, name: str) -> Optional[Agent]:
        """通过名称获取子代理（返回第一个匹配）"""
        result = await self.session.execute(
            select(Agent).where(Agent.name == name)
        )
        return result.scalars().first()

    async def get_by_name_and_scope(self, name: str, scope: str) -> Optional[Agent]:
        """
        通过名称和作用域获取子代理

        如果存在多条记录，返回最新的一条（ID 最大）
        """
        result = await self.session.execute(
            select(Agent)
            .where(and_(Agent.name == name, Agent.scope == scope))
            .order_by(Agent.id.desc())  # 最新的在前
        )
        return result.scalars().first()

    async def get_by_path(self, path: str) -> Optional[Agent]:
        """
        通过文件路径获取子代理

        如果存在多条记录，返回最新的一条（ID 最大）
        """
        result = await self.session.execute(
            select(Agent)
            .where(func.json_extract(Agent.meta, "$.path") == path)
            .order_by(Agent.id.desc())  # 最新的在前
        )
        return result.scalars().first()

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        scope: Optional[str] = None,
        active_only: bool = False
    ) -> tuple[list[Agent], int]:
        """
        获取所有子代理

        Args:
            skip: 跳过数量
            limit: 返回数量
            scope: 过滤作用域
            active_only: 仅返回激活的

        Returns:
            tuple[list[Agent], int]: 子代理列表和总数
        """
        conditions = []

        if scope:
            conditions.append(Agent.scope == scope)

        if active_only:
            conditions.append(Agent.is_active == True)

        # 基础查询
        query = select(Agent)
        if conditions:
            query = query.where(and_(*conditions))

        # 获取总数
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()

        # 排序：优先级 > 名称
        query = query.order_by(Agent.priority, Agent.name).offset(skip).limit(limit)

        result = await self.session.execute(query)
        agents = list(result.scalars().all())

        return agents, total

    async def get_scope_counts(self) -> Dict[str, int]:
        """获取各作用域的子代理数量"""
        result = await self.session.execute(
            select(Agent.scope, func.count(Agent.id))
            .group_by(Agent.scope)
        )
        return dict(result.all())

    async def update(self, agent_id: int, agent_data: AgentUpdate) -> Optional[Agent]:
        """更新子代理"""
        agent = await self.get_by_id(agent_id)
        if not agent:
            return None

        update_data = agent_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(agent, field, value)

        await self.session.commit()
        await self.session.refresh(agent)
        return agent

    async def delete(self, agent_id: int) -> bool:
        """删除子代理"""
        agent = await self.get_by_id(agent_id)
        if not agent:
            return False

        await self.session.delete(agent)
        await self.session.commit()
        return True

    async def delete_by_scope(self, scope: str) -> int:
        """删除指定作用域的所有子代理"""
        result = await self.session.execute(
            select(Agent).where(Agent.scope == scope)
        )
        agents = result.scalars().all()
        count = len(agents)

        for agent in agents:
            await self.session.delete(agent)

        await self.session.commit()
        return count

    async def delete_by_paths(self, paths: List[str]) -> int:
        """删除指定路径列表中的子代理"""
        count = 0
        for path in paths:
            agent = await self.get_by_path(path)
            if agent:
                await self.session.delete(agent)
                count += 1

        await self.session.commit()
        return count

    async def search(
        self,
        query: str,
        skip: int = 0,
        limit: int = 100
    ) -> tuple[list[Agent], int]:
        """搜索子代理"""
        search_query = select(Agent).where(
            or_(
                Agent.name.ilike(f"%{query}%"),
                Agent.description.ilike(f"%{query}%")
            )
        )

        # 获取总数
        count_query = select(func.count()).select_from(search_query.subquery())
        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()

        # 排序和分页
        search_query = search_query.order_by(Agent.priority, Agent.name).offset(skip).limit(limit)

        result = await self.session.execute(search_query)
        agents = list(result.scalars().all())

        return agents, total

    async def bulk_upsert(self, agents_data: List[Dict[str, Any]]) -> Dict[str, int]:
        """
        批量更新或插入子代理

        使用文件路径作为唯一标识，自动去重

        Returns:
            Dict: {"created": int, "updated": int, "skipped": int}
        """
        created = 0
        updated = 0
        skipped = 0

        # 第一步：对输入数据去重（相同 scope + path 只保留一个）
        seen_keys = set()
        deduplicated_data = []

        for data in agents_data:
            path = data.get("meta", {}).get("path", "")
            scope = data.get("scope", "builtin")

            # 生成唯一键
            if path:
                unique_key = f"{scope}:{path}"
            else:
                unique_key = f"{scope}:{data['name']}"

            if unique_key in seen_keys:
                skipped += 1
                continue

            seen_keys.add(unique_key)
            deduplicated_data.append(data)

        # 第二步：处理去重后的数据
        for data in deduplicated_data:
            path = data.get("meta", {}).get("path", "")

            if path:
                # 先清理该路径的所有重复记录（保留最新的）
                result = await self.session.execute(
                    select(Agent)
                    .where(
                        and_(
                            Agent.scope == data.get("scope", "builtin"),
                            func.json_extract(Agent.meta, "$.path") == path
                        )
                    )
                    .order_by(Agent.id.desc())
                )
                existing_records = list(result.scalars().all())

                if existing_records:
                    # 保留第一条（最新的），删除其他的
                    existing = existing_records[0]
                    for duplicate in existing_records[1:]:
                        await self.session.delete(duplicate)

                    # 更新保留的记录
                    for field, value in data.items():
                        if hasattr(existing, field):
                            setattr(existing, field, value)
                    updated += 1
                else:
                    # 创建新记录
                    agent = Agent(**data)
                    self.session.add(agent)
                    created += 1
            else:
                # 内置 agent 没有路径，使用 name + scope
                # 先清理该 name + scope 的所有重复记录
                result = await self.session.execute(
                    select(Agent)
                    .where(
                        and_(
                            Agent.name == data["name"],
                            Agent.scope == data.get("scope", "builtin")
                        )
                    )
                    .order_by(Agent.id.desc())
                )
                existing_records = list(result.scalars().all())

                if existing_records:
                    # 保留第一条（最新的），删除其他的
                    existing = existing_records[0]
                    for duplicate in existing_records[1:]:
                        await self.session.delete(duplicate)

                    # 更新保留的记录
                    for field, value in data.items():
                        if hasattr(existing, field):
                            setattr(existing, field, value)
                    updated += 1
                else:
                    # 创建新记录
                    agent = Agent(**data)
                    self.session.add(agent)
                    created += 1

        await self.session.commit()
        return {"created": created, "updated": updated, "skipped": skipped}

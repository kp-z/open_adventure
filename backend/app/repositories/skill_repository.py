"""
Skill Repository
"""
from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.skill import Skill, SkillSource
from app.schemas.skill import SkillCreate, SkillUpdate


class SkillRepository:
    """Repository for Skill CRUD operations"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, skill_data: SkillCreate) -> Skill:
        """Create a new skill"""
        # 只提取 Skill 模型需要的字段，排除 scripts、references 和 scope
        # scope 是用于创建 skill 时指定保存位置的，不是 ORM 字段
        skill_dict = skill_data.model_dump(exclude={'scripts', 'references', 'scope'})
        skill = Skill(**skill_dict)
        self.session.add(skill)
        await self.session.commit()
        await self.session.refresh(skill)
        return skill

    async def get_by_id(self, skill_id: int) -> Optional[Skill]:
        """Get skill by ID"""
        result = await self.session.execute(
            select(Skill).where(Skill.id == skill_id)
        )
        return result.scalar_one_or_none()

    async def get_by_name(self, name: str) -> Optional[Skill]:
        """Get skill by name"""
        result = await self.session.execute(
            select(Skill).where(Skill.name == name)
        )
        return result.scalar_one_or_none()

    async def get_by_path(self, path: str) -> Optional[Skill]:
        """
        Get skill by path (from meta.path)
        
        使用路径作为唯一标识，支持同名 skill 在不同位置的情况
        """
        from sqlalchemy import text
        
        # 使用 SQLite 的 json_extract 函数
        result = await self.session.execute(
            select(Skill).where(
                func.json_extract(Skill.meta, "$.path") == path
            )
        )
        return result.scalar_one_or_none()

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        source: Optional[SkillSource] = None,
        enabled: Optional[bool] = None
    ) -> tuple[list[Skill], int]:
        """Get all skills with pagination and filters"""
        query = select(Skill)

        # Apply filters
        if source is not None:
            query = query.where(Skill.source == source)
        if enabled is not None:
            query = query.where(Skill.enabled == enabled)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()

        # Apply pagination
        query = query.offset(skip).limit(limit).order_by(Skill.id)

        result = await self.session.execute(query)
        skills = list(result.scalars().all())

        return skills, total

    async def update(self, skill_id: int, skill_data: SkillUpdate) -> Optional[Skill]:
        """Update a skill"""
        skill = await self.get_by_id(skill_id)
        if not skill:
            return None

        update_data = skill_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(skill, field, value)

        await self.session.commit()
        await self.session.refresh(skill)
        return skill

    async def delete(self, skill_id: int) -> bool:
        """Delete a skill"""
        skill = await self.get_by_id(skill_id)
        if not skill:
            return False

        await self.session.delete(skill)
        await self.session.commit()
        return True

    async def search(
        self,
        query: str,
        skip: int = 0,
        limit: int = 100
    ) -> tuple[list[Skill], int]:
        """Search skills by name or description"""
        search_query = select(Skill).where(
            (Skill.name.ilike(f"%{query}%")) |
            (Skill.description.ilike(f"%{query}%"))
        )

        # Get total count
        count_query = select(func.count()).select_from(search_query.subquery())
        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()

        # Apply pagination
        search_query = search_query.offset(skip).limit(limit).order_by(Skill.id)

        result = await self.session.execute(search_query)
        skills = list(result.scalars().all())

        return skills, total

"""Project 索引数据访问层"""
from __future__ import annotations

from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project


class ProjectRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, project: Project) -> Project:
        self.session.add(project)
        await self.session.commit()
        await self.session.refresh(project)
        return project

    async def get(self, project_id: int) -> Optional[Project]:
        r = await self.session.execute(select(Project).where(Project.id == project_id))
        return r.scalar_one_or_none()

    async def get_by_path(self, path: str) -> Optional[Project]:
        r = await self.session.execute(select(Project).where(Project.path == path))
        return r.scalar_one_or_none()

    async def list_all(
        self, skip: int = 0, limit: int = 100
    ) -> tuple[list[Project], int]:
        total_r = await self.session.execute(select(func.count()).select_from(Project))
        total = total_r.scalar_one()
        q = select(Project).order_by(Project.id.desc()).offset(skip).limit(limit)
        r = await self.session.execute(q)
        return list(r.scalars().all()), total

    async def update(self, project: Project) -> Project:
        await self.session.commit()
        await self.session.refresh(project)
        return project

    async def delete(self, project: Project) -> None:
        # 注意：session.delete() 是同步方法，不需要 await
        self.session.delete(project)
        await self.session.commit()

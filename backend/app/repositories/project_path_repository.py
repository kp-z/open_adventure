"""
Project Path Repository
"""
from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project_path import ProjectPath


class ProjectPathRepository:
    """Repository for ProjectPath CRUD operations"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, path: str, alias: Optional[str] = None,
                    enabled: bool = True, recursive_scan: bool = True) -> ProjectPath:
        """Create a new project path"""
        project_path = ProjectPath(
            path=path,
            alias=alias,
            enabled=enabled,
            recursive_scan=recursive_scan
        )
        self.session.add(project_path)
        await self.session.commit()
        await self.session.refresh(project_path)
        return project_path

    async def get_by_id(self, path_id: int) -> Optional[ProjectPath]:
        """Get project path by ID"""
        result = await self.session.execute(
            select(ProjectPath).where(ProjectPath.id == path_id)
        )
        return result.scalar_one_or_none()

    async def get_by_path(self, path: str) -> Optional[ProjectPath]:
        """Get project path by path string"""
        result = await self.session.execute(
            select(ProjectPath).where(ProjectPath.path == path)
        )
        return result.scalar_one_or_none()

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        enabled: Optional[bool] = None
    ) -> tuple[list[ProjectPath], int]:
        """Get all project paths with pagination and filters"""
        query = select(ProjectPath)

        # Apply filters
        if enabled is not None:
            query = query.where(ProjectPath.enabled == enabled)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()

        # Apply pagination
        query = query.offset(skip).limit(limit).order_by(ProjectPath.id)

        result = await self.session.execute(query)
        paths = list(result.scalars().all())

        return paths, total

    async def get_enabled_paths(self) -> list[ProjectPath]:
        """Get all enabled project paths"""
        result = await self.session.execute(
            select(ProjectPath).where(ProjectPath.enabled == True).order_by(ProjectPath.id)
        )
        return list(result.scalars().all())

    async def update(
        self,
        path_id: int,
        path: Optional[str] = None,
        alias: Optional[str] = None,
        enabled: Optional[bool] = None,
        recursive_scan: Optional[bool] = None
    ) -> Optional[ProjectPath]:
        """Update a project path"""
        project_path = await self.get_by_id(path_id)
        if not project_path:
            return None

        if path is not None:
            project_path.path = path
        if alias is not None:
            project_path.alias = alias
        if enabled is not None:
            project_path.enabled = enabled
        if recursive_scan is not None:
            project_path.recursive_scan = recursive_scan

        await self.session.commit()
        await self.session.refresh(project_path)
        return project_path

    async def delete(self, path_id: int) -> bool:
        """Delete a project path"""
        project_path = await self.get_by_id(path_id)
        if not project_path:
            return False

        await self.session.delete(project_path)
        await self.session.commit()
        return True

"""
Project Path Service
"""
import os
from pathlib import Path
from typing import Optional

from app.repositories.project_path_repository import ProjectPathRepository
from app.models.project_path import ProjectPath
from app.core.exceptions import NotFoundException, ConflictException


class ProjectPathService:
    """Service for project path business logic"""

    def __init__(self, repository: ProjectPathRepository):
        self.repository = repository

    def _validate_path(self, path: str) -> Path:
        """Validate that the path exists and is a directory"""
        path_obj = Path(path).expanduser().resolve()

        if not path_obj.exists():
            raise ValueError(f"路径不存在: {path}")

        if not path_obj.is_dir():
            raise ValueError(f"路径不是目录: {path}")

        return path_obj

    async def create_project_path(
        self,
        path: str,
        alias: Optional[str] = None,
        enabled: bool = True,
        recursive_scan: bool = True
    ) -> ProjectPath:
        """Create a new project path configuration"""
        # Validate path
        validated_path = self._validate_path(path)
        normalized_path = str(validated_path)

        # Check for duplicates
        existing = await self.repository.get_by_path(normalized_path)
        if existing:
            raise ConflictException(f"项目路径已存在: {normalized_path}")

        # Generate alias if not provided
        if not alias:
            alias = validated_path.name

        return await self.repository.create(
            path=normalized_path,
            alias=alias,
            enabled=enabled,
            recursive_scan=recursive_scan
        )

    async def get_project_path(self, path_id: int) -> ProjectPath:
        """Get project path by ID"""
        project_path = await self.repository.get_by_id(path_id)
        if not project_path:
            raise NotFoundException(f"项目路径不存在: {path_id}")
        return project_path

    async def list_project_paths(
        self,
        skip: int = 0,
        limit: int = 100,
        enabled: Optional[bool] = None
    ) -> tuple[list[ProjectPath], int]:
        """List all project paths with pagination"""
        return await self.repository.get_all(skip=skip, limit=limit, enabled=enabled)

    async def get_enabled_paths(self) -> list[ProjectPath]:
        """Get all enabled project paths"""
        return await self.repository.get_enabled_paths()

    async def update_project_path(
        self,
        path_id: int,
        path: Optional[str] = None,
        alias: Optional[str] = None,
        enabled: Optional[bool] = None,
        recursive_scan: Optional[bool] = None
    ) -> ProjectPath:
        """Update a project path configuration"""
        # Validate new path if provided
        normalized_path = None
        if path is not None:
            validated_path = self._validate_path(path)
            normalized_path = str(validated_path)

            # Check for duplicates (excluding current path)
            existing = await self.repository.get_by_path(normalized_path)
            if existing and existing.id != path_id:
                raise ConflictException(f"项目路径已存在: {normalized_path}")

        updated = await self.repository.update(
            path_id=path_id,
            path=normalized_path,
            alias=alias,
            enabled=enabled,
            recursive_scan=recursive_scan
        )

        if not updated:
            raise NotFoundException(f"项目路径不存在: {path_id}")

        return updated

    async def toggle_enabled(self, path_id: int) -> ProjectPath:
        """Toggle enabled status of a project path"""
        project_path = await self.get_project_path(path_id)
        return await self.update_project_path(
            path_id=path_id,
            enabled=not project_path.enabled
        )

    async def delete_project_path(self, path_id: int) -> bool:
        """Delete a project path configuration"""
        success = await self.repository.delete(path_id)
        if not success:
            raise NotFoundException(f"项目路径不存在: {path_id}")
        return success

"""
Project Path API Router
"""
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.repositories.project_path_repository import ProjectPathRepository
from app.services.project_path_service import ProjectPathService
from app.schemas.project_path import (
    ProjectPathCreate,
    ProjectPathUpdate,
    ProjectPathResponse,
    ProjectPathListResponse
)
from app.core.exceptions import NotFoundException, ConflictException
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/project-paths", tags=["project-paths"])


def get_project_path_service(db: AsyncSession = Depends(get_db)) -> ProjectPathService:
    """Dependency to get project path service"""
    repository = ProjectPathRepository(db)
    return ProjectPathService(repository)


@router.get("", response_model=ProjectPathListResponse)
async def list_project_paths(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    enabled: Optional[bool] = Query(None),
    service: ProjectPathService = Depends(get_project_path_service)
):
    """获取项目路径列表"""
    try:
        paths, total = await service.list_project_paths(
            skip=skip,
            limit=limit,
            enabled=enabled
        )
        return ProjectPathListResponse(total=total, items=paths)
    except Exception as e:
        logger.error(f"Failed to list project paths: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/{path_id}", response_model=ProjectPathResponse)
async def get_project_path(
    path_id: int,
    service: ProjectPathService = Depends(get_project_path_service)
):
    """获取单个项目路径"""
    try:
        return await service.get_project_path(path_id)
    except NotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to get project path {path_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("", response_model=ProjectPathResponse, status_code=status.HTTP_201_CREATED)
async def create_project_path(
    path_data: ProjectPathCreate,
    service: ProjectPathService = Depends(get_project_path_service)
):
    """创建新的项目路径配置"""
    try:
        return await service.create_project_path(
            path=path_data.path,
            alias=path_data.alias,
            enabled=path_data.enabled,
            recursive_scan=path_data.recursive_scan
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except ConflictException as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to create project path: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.put("/{path_id}", response_model=ProjectPathResponse)
async def update_project_path(
    path_id: int,
    path_data: ProjectPathUpdate,
    service: ProjectPathService = Depends(get_project_path_service)
):
    """更新项目路径配置"""
    try:
        return await service.update_project_path(
            path_id=path_id,
            path=path_data.path,
            alias=path_data.alias,
            enabled=path_data.enabled,
            recursive_scan=path_data.recursive_scan
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except NotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ConflictException as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to update project path {path_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/{path_id}/toggle", response_model=ProjectPathResponse)
async def toggle_project_path(
    path_id: int,
    service: ProjectPathService = Depends(get_project_path_service)
):
    """切换项目路径启用状态"""
    try:
        return await service.toggle_enabled(path_id)
    except NotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to toggle project path {path_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.delete("/{path_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project_path(
    path_id: int,
    service: ProjectPathService = Depends(get_project_path_service)
):
    """删除项目路径配置"""
    try:
        await service.delete_project_path(path_id)
    except NotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to delete project path {path_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/scan-git-repos")
async def scan_git_repos(
    service: ProjectPathService = Depends(get_project_path_service)
):
    """
    手动扫描 Git 仓库并添加到项目路径

    扫描 /mnt 和用户主目录下的所有 Git 仓库，自动添加到项目路径配置
    """
    try:
        from app.services.git_repo_scanner import GitRepoScanner

        scanner = GitRepoScanner()
        base_dirs = ["/mnt", str(Path.home())]
        git_repos = scanner.scan_directories(base_dirs, max_depth=3)

        added_count = 0
        skipped_count = 0

        for repo_path in git_repos:
            try:
                await service.create_project_path(
                    path=repo_path,
                    alias=Path(repo_path).name,
                    enabled=True,
                    recursive_scan=True
                )
                added_count += 1
            except ConflictException:
                # 已存在，跳过
                skipped_count += 1
            except Exception as e:
                logger.warning(f"Failed to add project path {repo_path}: {e}")

        return {
            "success": True,
            "total_found": len(git_repos),
            "added": added_count,
            "skipped": skipped_count
        }
    except Exception as e:
        logger.error(f"Failed to scan git repositories: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

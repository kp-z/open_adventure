"""
Project 索引 API：元数据 CRUD、.claude 与 web/ 操作、Workspace 进程启停。
"""
from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.project import Project
from app.repositories.project_path_repository import ProjectPathRepository
from app.schemas.project import (
    AgentMarkdownBody,
    BindAgentRequest,
    ClaudeConfigUpdate,
    ProjectCreate,
    ProjectCreateFromPath,
    ProjectListResponse,
    ProjectResponse,
    ProjectScanRequest,
    ProjectScanResult,
    ProjectUpdate,
    ScanResultResponse,
    ScreenshotResponse,
    WorkspaceConfig,
    WorkspaceStatusResponse,
)
from app.services import project_filesystem_service as pfs
from app.services.project_service import ProjectService
from app.services.screenshot_service import get_screenshot_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/projects", tags=["projects"])


def get_project_service(db: AsyncSession = Depends(get_db)) -> ProjectService:
    return ProjectService(db)


def _to_response(p: Project) -> ProjectResponse:
    # workspace_scanned 来自磁盘 config，与 has_workspace（web/ 探测）解耦
    base = ProjectResponse.model_validate(p)
    scanned = pfs.is_workspace_config_scanned(p.path)
    return base.model_copy(update={"workspace_scanned": scanned})


@router.get("", response_model=ProjectListResponse)
async def list_projects(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    include_disabled: bool = Query(False, description="是否包含禁用路径下的项目"),
    service: ProjectService = Depends(get_project_service),
):
    """获取项目列表

    默认只返回 enabled 的 ProjectPath 下的项目。
    如果 include_disabled=True，则返回所有项目。
    """
    items, total = await service.list_projects(
        skip=skip,
        limit=limit,
        include_disabled_paths=include_disabled
    )
    return ProjectListResponse(
        items=[_to_response(p) for p in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    body: ProjectCreate,
    service: ProjectService = Depends(get_project_service),
):
    try:
        p = await service.create(body)
        return _to_response(p)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e


@router.post("/from-path", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project_from_path(
    body: ProjectCreateFromPath,
    service: ProjectService = Depends(get_project_service),
):
    try:
        p = await service.create_from_path(body)
        return _to_response(p)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e


@router.post("/scan", response_model=ProjectScanResult)
async def scan_projects(
    body: ProjectScanRequest,
    service: ProjectService = Depends(get_project_service),
):
    discovered, created_ids = await service.scan_git_roots(
        body.root_path, max_depth=body.max_depth
    )
    return ProjectScanResult(discovered=discovered, created_ids=created_ids)


@router.post("/sync-from-paths")
async def sync_from_project_paths(
    db: AsyncSession = Depends(get_db),
    service: ProjectService = Depends(get_project_service),
):
    """
    从 project_paths 表同步项目到 projects 表。

    遍历所有 enabled=True 的 project_paths，
    对于 projects 表中不存在的路径，自动创建对应的 Project。

    Returns:
        synced: 新创建的项目数量
        skipped: 已存在的项目数量（跳过）
        errors: 创建失败的数量
    """
    path_repo = ProjectPathRepository(db)
    enabled_paths = await path_repo.get_enabled_paths()

    synced = 0
    skipped = 0
    errors = 0

    for pp in enabled_paths:
        try:
            # 使用 create_from_path 创建项目（内部会检查是否已存在）
            await service.create_from_path(
                ProjectCreateFromPath(
                    path=pp.path,
                    name=pp.alias,  # 使用 alias 作为项目名称（如果有）
                    description=None
                )
            )
            synced += 1
            logger.info(f"Synced project from path: {pp.path}")
        except ValueError as e:
            # 路径已存在或不是目录
            if "路径已存在索引" in str(e):
                skipped += 1
            else:
                errors += 1
                logger.warning(f"Failed to sync path {pp.path}: {e}")

    return {
        "synced": synced,
        "skipped": skipped,
        "errors": errors,
        "total_paths": len(enabled_paths)
    }


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: int,
    service: ProjectService = Depends(get_project_service),
):
    p = await service.get(project_id)
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="项目不存在")
    return _to_response(p)


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    body: ProjectUpdate,
    service: ProjectService = Depends(get_project_service),
):
    p = await service.update(project_id, body)
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="项目不存在")
    return _to_response(p)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: int,
    service: ProjectService = Depends(get_project_service),
):
    ok = await service.delete(project_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="项目不存在")


@router.post("/{project_id}/init", response_model=dict[str, Any])
async def init_project_claude(
    project_id: int,
    service: ProjectService = Depends(get_project_service),
):
    try:
        return await service.init_claude(project_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e


@router.post("/{project_id}/sync", response_model=ProjectResponse)
async def sync_project(
    project_id: int,
    service: ProjectService = Depends(get_project_service),
):
    p = await service.sync(project_id)
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="项目不存在")
    return _to_response(p)


@router.get("/{project_id}/config", response_model=dict[str, Any])
async def get_project_config(
    project_id: int,
    service: ProjectService = Depends(get_project_service),
):
    p = await service.get(project_id)
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="项目不存在")
    cfg = await service.get_claude_config(project_id)
    if cfg is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="未找到 .claude/config.json")
    return cfg


@router.put("/{project_id}/config", response_model=dict[str, Any])
async def put_project_config(
    project_id: int,
    body: ClaudeConfigUpdate,
    service: ProjectService = Depends(get_project_service),
):
    merged = await service.put_claude_config(project_id, body.raw)
    if merged is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="项目不存在")
    return merged


@router.get("/{project_id}/agent", response_model=dict[str, Optional[str]])
async def get_project_agent(
    project_id: int,
    service: ProjectService = Depends(get_project_service),
):
    p = await service.get(project_id)
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="项目不存在")
    content = await service.get_agent_md(project_id)
    return {"content": content}


@router.put("/{project_id}/agent", response_model=dict[str, bool])
async def put_project_agent(
    project_id: int,
    body: AgentMarkdownBody,
    service: ProjectService = Depends(get_project_service),
):
    ok = await service.put_agent_md(project_id, body.content)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="项目不存在")
    return {"ok": True}


@router.get("/{project_id}/workspace/status", response_model=WorkspaceStatusResponse)
async def workspace_status(
    project_id: int,
    service: ProjectService = Depends(get_project_service),
):
    p = await service.get(project_id)
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="项目不存在")
    st = service.workspace_status(project_id)
    port = st.get("port")
    url: Optional[str] = st.get("url")
    if url is None and port and p:
        url = pfs.suggest_workspace_url_from_filesystem(p.path, int(port))
    return WorkspaceStatusResponse(
        running=bool(st.get("running")),
        url=url,
        port=port,
        pid=st.get("pid"),
        started_at=st.get("started_at"),
        health=str(st.get("health") or "unknown"),
        last_error=st.get("last_error"),
        phase=str(st.get("phase") or "stopped"),
    )


@router.post("/{project_id}/workspace/start", response_model=WorkspaceStatusResponse)
async def workspace_start(
    project_id: int,
    service: ProjectService = Depends(get_project_service),
):
    p = await service.get(project_id)
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="项目不存在")
    try:
        st = await service.workspace_start(project_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)) from e
    port = st.get("port")
    url: Optional[str] = st.get("url")
    if url is None and port:
        url = pfs.suggest_workspace_url_from_filesystem(p.path, int(port))
    return WorkspaceStatusResponse(
        running=bool(st.get("running")),
        url=url,
        port=port,
        pid=st.get("pid"),
        started_at=st.get("started_at"),
        health=str(st.get("health") or "unknown"),
        last_error=st.get("last_error"),
        phase=str(st.get("phase") or "stopped"),
    )


@router.post("/{project_id}/workspace/stop", response_model=dict[str, Any])
async def workspace_stop(
    project_id: int,
    service: ProjectService = Depends(get_project_service),
):
    p = await service.get(project_id)
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="项目不存在")
    return service.workspace_stop(project_id)


@router.post("/{project_id}/workspace/restart", response_model=WorkspaceStatusResponse)
async def workspace_restart(
    project_id: int,
    service: ProjectService = Depends(get_project_service),
):
    p = await service.get(project_id)
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="项目不存在")
    try:
        st = await service.workspace_restart(project_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)) from e
    port = st.get("port")
    url: Optional[str] = st.get("url")
    if url is None and port:
        url = pfs.suggest_workspace_url_from_filesystem(p.path, int(port))
    return WorkspaceStatusResponse(
        running=bool(st.get("running")),
        url=url,
        port=port,
        pid=st.get("pid"),
        started_at=st.get("started_at"),
        health=str(st.get("health") or "unknown"),
        last_error=st.get("last_error"),
        phase=str(st.get("phase") or "stopped"),
    )


@router.post("/{project_id}/workspace/init", response_model=dict[str, Any])
async def workspace_init(
    project_id: int,
    service: ProjectService = Depends(get_project_service),
):
    try:
        return await service.init_workspace_stub(project_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e


@router.get("/{project_id}/workspace/logs", response_model=dict[str, Any])
async def workspace_logs(
    project_id: int,
    service: ProjectService = Depends(get_project_service),
):
    p = await service.get(project_id)
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="项目不存在")
    # 进程 stdout 未持久化；预留字段供后续接入文件日志
    return {"lines": [], "note": "当前版本未采集 dev server 日志，请在本机终端查看。"}


# ========== Project Agent 关联 API ==========


@router.post("/{project_id}/bind-agent", response_model=ProjectResponse)
async def bind_agent(
    project_id: int,
    body: BindAgentRequest,
    service: ProjectService = Depends(get_project_service),
):
    """绑定 Agent 到 Project"""
    try:
        p = await service.bind_agent(project_id, body.agent_id)
        return _to_response(p)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e


@router.delete("/{project_id}/bind-agent", response_model=ProjectResponse)
async def unbind_agent(
    project_id: int,
    service: ProjectService = Depends(get_project_service),
):
    """解绑 Project 的 Agent"""
    try:
        p = await service.unbind_agent(project_id)
        return _to_response(p)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e


@router.post("/{project_id}/scan", response_model=ScanResultResponse)
async def scan_project_structure(
    project_id: int,
    service: ProjectService = Depends(get_project_service),
):
    """
    手动触发项目结构扫描

    扫描项目的前端入口目录、框架类型、启动命令等，
    并将结果写入 .claude/config.json
    """
    try:
        ws_config = await service.scan_project_structure(project_id)
        return ScanResultResponse(
            success=True,
            workspace_config=WorkspaceConfig(**ws_config),
            message="扫描完成"
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e


@router.post("/{project_id}/screenshot", response_model=ScreenshotResponse)
async def capture_screenshot(
    project_id: int,
    service: ProjectService = Depends(get_project_service),
):
    """
    手动触发截图

    截取运行中的 Workspace 页面并保存为缩略图
    """
    p = await service.get(project_id)
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="项目不存在")

    # 检查 Workspace 是否运行中
    ws_status = service.workspace_status(project_id)
    if not ws_status.get("running"):
        return ScreenshotResponse(
            success=False,
            path=None,
            message="Workspace 未运行，无法截图"
        )

    url = ws_status.get("url")
    if not url:
        return ScreenshotResponse(
            success=False,
            path=None,
            message="无法获取 Workspace URL"
        )

    try:
        screenshot_service = get_screenshot_service()
        path = await screenshot_service.capture(project_id, url)
        # 清理旧缩略图
        await screenshot_service.cleanup_old_thumbnails(project_id, keep=3)
        return ScreenshotResponse(
            success=True,
            path=path,
            message="截图完成"
        )
    except Exception as e:
        logger.exception(f"Screenshot failed for project {project_id}")
        return ScreenshotResponse(
            success=False,
            path=None,
            message=f"截图失败: {str(e)}"
        )


@router.get("/{project_id}/thumbnail")
async def get_thumbnail(
    project_id: int,
    service: ProjectService = Depends(get_project_service),
):
    """
    获取项目缩略图

    返回最新的缩略图文件
    """
    from fastapi.responses import FileResponse

    p = await service.get(project_id)
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="项目不存在")

    screenshot_service = get_screenshot_service()
    path = screenshot_service.get_thumbnail_path(project_id)

    if not path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="暂无缩略图")

    return FileResponse(
        path,
        media_type="image/webp",
        headers={"Cache-Control": "max-age=60"}  # 缓存 60 秒
    )

"""
本地文件系统 HTTP 服务路由。
将本地绝对路径通过 HTTP 暴露，使 file:// URL 可以在 iframe 中加载。
仅允许访问已在 projects 表中登记的项目目录，防止任意路径穿越。
"""
from __future__ import annotations

import mimetypes
import urllib.parse
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.repositories.project_repository import ProjectRepository

router = APIRouter(prefix="/localfs", tags=["localfs"])


async def _resolve_and_check(file_path: str, db: AsyncSession) -> Path:
    """
    解析路径并验证它属于某个已登记项目目录。
    防止路径穿越攻击（../）。
    """
    decoded = urllib.parse.unquote(file_path)
    resolved = Path("/" + decoded).resolve()

    repo = ProjectRepository(db)
    projects, _ = await repo.list_all(skip=0, limit=10000)
    allowed_roots = [Path(p.path).resolve() for p in projects if p.path]

    if not any(str(resolved).startswith(str(root)) for root in allowed_roots):
        raise HTTPException(status_code=403, detail="路径不在任何已登记的项目目录下")

    if not resolved.exists():
        raise HTTPException(status_code=404, detail="文件不存在")

    if not resolved.is_file():
        raise HTTPException(status_code=400, detail="不是文件")

    return resolved


@router.get("/{file_path:path}")
async def serve_local_file(
    file_path: str,
    db: AsyncSession = Depends(get_db),
):
    """通过 HTTP 提供本地文件访问，路径为去掉开头斜杠的绝对路径。

    示例：GET /api/localfs/Users/kp/项目/Proj/controller/index.html

    对 HTML 文件自动注入 <base> 标签，确保相对路径资源正确加载。
    """
    resolved = await _resolve_and_check(file_path, db)
    media_type, _ = mimetypes.guess_type(str(resolved))

    # HTML 文件：注入 <base> 标签，使相对路径相对于文件所在目录
    if resolved.suffix.lower() == ".html":
        parent_path = str(resolved.parent)
        base_href = f"/api/localfs{parent_path}/"
        content = resolved.read_text(encoding="utf-8", errors="replace")
        if "<base " not in content:
            content = content.replace("<head>", f"<head>\n  <base href=\"{base_href}\">", 1)
            if "<head>" not in content:
                content = f'<base href="{base_href}">\n' + content
        return HTMLResponse(content=content)

    return FileResponse(
        path=str(resolved),
        media_type=media_type or "application/octet-stream",
    )

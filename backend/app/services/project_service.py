"""Project 索引业务逻辑：CRUD、同步、初始化 .claude、Workspace 生命周期。"""
from __future__ import annotations

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project
from app.repositories.project_repository import ProjectRepository
from app.repositories.project_path_repository import ProjectPathRepository
from app.schemas.project import ProjectCreate, ProjectCreateFromPath, ProjectUpdate
from app.services import project_filesystem_service as pfs
from app.services.workspace_process_service import get_workspace_process_service

logger = logging.getLogger(__name__)


class ProjectService:
    def __init__(self, session: AsyncSession):
        self.repo = ProjectRepository(session)

    async def list_projects(
        self,
        skip: int = 0,
        limit: int = 100,
        include_disabled_paths: bool = False
    ) -> tuple[list[Project], int]:
        """获取项目列表

        Args:
            skip: 跳过数量
            limit: 返回数量
            include_disabled_paths: 是否包含禁用路径下的项目

        Returns:
            tuple[list[Project], int]: 项目列表和总数
        """
        # 先获取全部项目（不分页，因为需要过滤后再分页）
        all_projects, _ = await self.repo.list_all(skip=0, limit=10000)

        if include_disabled_paths:
            # 不过滤，直接分页返回
            total = len(all_projects)
            return all_projects[skip:skip + limit], total

        # 获取所有 enabled 的 ProjectPath
        path_repo = ProjectPathRepository(self.session)
        enabled_paths = await path_repo.get_enabled_paths()

        # 边界情况：如果没有配置任何 ProjectPath，则显示所有项目
        if not enabled_paths:
            total = len(all_projects)
            return all_projects[skip:skip + limit], total

        enabled_path_strs = [p.path for p in enabled_paths]

        # 过滤：Project.path 必须以某个 enabled path 开头
        def is_under_enabled_path(project: Project) -> bool:
            for ep in enabled_path_strs:
                if project.path.startswith(ep):
                    return True
            return False

        filtered = [p for p in all_projects if is_under_enabled_path(p)]
        total = len(filtered)
        return filtered[skip:skip + limit], total

    async def get(self, project_id: int) -> Optional[Project]:
        return await self.repo.get(project_id)

    async def create(self, data: ProjectCreate) -> Project:
        path = str(Path(data.path).expanduser().resolve())
        existing = await self.repo.get_by_path(path)
        if existing:
            raise ValueError(f"路径已存在索引: id={existing.id}")

        probe = pfs.probe_project_directory(path)
        now = datetime.utcnow()
        p = Project(
            name=data.name,
            path=path,
            description=data.description,
            has_agent=probe["has_agent"],
            has_workspace=probe["has_workspace"],
            workspace_port=probe.get("workspace_port"),
            git_remote=probe.get("git_remote"),
            git_branch=probe.get("git_branch"),
            last_sync_at=now,
            meta={},
            created_at=now,
            updated_at=now,
        )
        return await self.repo.create(p)

    async def create_from_path(self, data: ProjectCreateFromPath) -> Project:
        path = str(Path(data.path).expanduser().resolve())
        if not Path(path).is_dir():
            raise ValueError("路径不存在或不是目录")
        name = data.name or Path(path).name
        return await self.create(ProjectCreate(name=name, path=path, description=data.description))

    async def update(self, project_id: int, data: ProjectUpdate) -> Optional[Project]:
        p = await self.repo.get(project_id)
        if not p:
            return None
        if data.name is not None:
            p.name = data.name
        if data.description is not None:
            p.description = data.description
        if data.workspace_port is not None:
            p.workspace_port = data.workspace_port
        if data.meta is not None:
            p.meta = data.meta
        p.updated_at = datetime.utcnow()
        await self.session.commit()
        await self.session.refresh(p)
        return p

    @property
    def session(self) -> AsyncSession:
        return self.repo.session

    async def delete(self, project_id: int) -> bool:
        p = await self.repo.get(project_id)
        if not p:
            return False
        get_workspace_process_service().stop(project_id)
        await self.repo.delete(p)
        return True

    async def sync(self, project_id: int) -> Optional[Project]:
        p = await self.repo.get(project_id)
        if not p:
            return None
        probe = pfs.probe_project_directory(p.path)
        p.has_agent = probe["has_agent"]
        p.has_workspace = probe["has_workspace"]
        if probe.get("workspace_port") is not None:
            p.workspace_port = probe["workspace_port"]
        p.git_remote = probe.get("git_remote")
        p.git_branch = probe.get("git_branch")
        p.last_sync_at = datetime.utcnow()
        p.updated_at = datetime.utcnow()
        await self.session.commit()
        await self.session.refresh(p)
        return p

    async def init_claude(self, project_id: int) -> dict[str, Any]:
        """在项目目录创建 .claude/agent.md 与基础 config.json。"""
        p = await self.repo.get(project_id)
        if not p:
            raise ValueError("项目不存在")

        root = Path(p.path).expanduser().resolve()
        if not root.is_dir():
            raise ValueError("项目路径无效")

        content = pfs.default_agent_markdown(p.name, str(root))
        pfs.write_agent_md(str(root), content)

        cfg_path = root / ".claude" / "config.json"
        if cfg_path.is_file():
            try:
                cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                cfg = {}
        else:
            cfg = {
                "name": p.name,
                "description": p.description or "",
                "workspace": {"enabled": False, "port": p.workspace_port or 5173, "auto_start": False},
                "agent": {"name": f"{p.name} 管家", "model": "claude-opus-4-6", "permission_mode": "full"},
            }
            pfs.write_claude_config(str(root), cfg)

        await self.sync(project_id)
        return {"agent_md_written": True, "config_path": str(cfg_path)}

    async def get_claude_config(self, project_id: int) -> Optional[dict[str, Any]]:
        p = await self.repo.get(project_id)
        if not p:
            return None
        return pfs.read_claude_config(p.path)

    async def put_claude_config(self, project_id: int, patch: dict[str, Any]) -> Optional[dict[str, Any]]:
        p = await self.repo.get(project_id)
        if not p:
            return None
        root = str(Path(p.path).expanduser().resolve())
        base = pfs.read_claude_config(root) or {}
        merged = pfs.merge_config(base, patch)
        pfs.write_claude_config(root, merged)
        if isinstance(patch.get("workspace"), dict) and patch["workspace"].get("port") is not None:
            try:
                p.workspace_port = int(patch["workspace"]["port"])
                p.updated_at = datetime.utcnow()
                await self.session.commit()
                await self.session.refresh(p)
            except (TypeError, ValueError):
                await self.sync(project_id)
        else:
            await self.sync(project_id)
        return merged

    async def get_agent_md(self, project_id: int) -> Optional[str]:
        p = await self.repo.get(project_id)
        if not p:
            return None
        return pfs.read_agent_md(p.path)

    async def put_agent_md(self, project_id: int, content: str) -> bool:
        p = await self.repo.get(project_id)
        if not p:
            return False
        pfs.write_agent_md(p.path, content)
        await self.sync(project_id)
        return True

    async def scan_git_roots(
        self, root_path: str, max_depth: int = 4
    ) -> tuple[list[str], list[int]]:
        """扫描目录下 Git 仓库并为未索引路径创建 Project。"""
        discovered = pfs.scan_git_repositories(root_path, max_depth=max_depth)
        created_ids: list[int] = []
        for path_str in discovered:
            resolved = str(Path(path_str).expanduser().resolve())
            existing = await self.repo.get_by_path(resolved)
            if existing:
                continue
            try:
                created = await self.create_from_path(
                    ProjectCreateFromPath(path=resolved, name=None, description=None)
                )
                created_ids.append(created.id)
            except ValueError as e:
                logger.warning("scan skip %s: %s", resolved, e)
        return discovered, created_ids

    async def init_workspace_stub(self, project_id: int) -> dict[str, Any]:
        """在项目下生成最小可 `npm install && npm run dev` 的 web/ 骨架。"""
        p = await self.repo.get(project_id)
        if not p:
            raise ValueError("项目不存在")
        root = Path(p.path).expanduser().resolve()
        if not root.is_dir():
            raise ValueError("项目路径无效")
        web_path = pfs.init_workspace_minimal(str(root), project_name=p.name)
        await self.sync(project_id)
        return {"web_path": web_path, "message": "请在 web/ 目录执行 npm install 后启动开发服务"}

    def workspace_status(self, project_id: int) -> dict[str, Any]:
        return get_workspace_process_service().status(project_id)

    async def scan_project_structure(self, project_id: int) -> dict[str, Any]:
        """
        扫描项目结构，识别前端入口和配置，写入 config.json

        Returns:
            扫描结果的 workspace 配置
        """
        p = await self.repo.get(project_id)
        if not p:
            raise ValueError("项目不存在")
        
        root = str(Path(p.path).expanduser().resolve())
        
        # 执行扫描
        scan_result = pfs.scan_project_structure(root)
        
        # 读取现有配置并合并
        cfg = pfs.read_claude_config(root) or {}
        cfg = pfs.merge_config(cfg, {"workspace": scan_result})
        pfs.write_claude_config(root, cfg)
        
        # 更新 Project 的 workspace_port
        if scan_result.get("port"):
            p.workspace_port = scan_result["port"]
            p.updated_at = datetime.utcnow()
            await self.session.commit()
            await self.session.refresh(p)
        
        logger.info(f"scan_project_structure: project_id={project_id}, result={scan_result}")
        return scan_result

    async def workspace_start(self, project_id: int) -> dict[str, Any]:
        """
        启动 Workspace 开发服务器

        首次启动时自动扫描项目结构，使用扫描结果的配置启动。
        """
        p = await self.repo.get(project_id)
        if not p:
            raise ValueError("项目不存在")
        
        root = str(Path(p.path).expanduser().resolve())
        
        # 读取 config.json 中的 workspace 配置
        cfg = pfs.read_claude_config(root) or {}
        ws_cfg = cfg.get("workspace", {})
        
        # 检查是否已扫描，未扫描则自动执行扫描
        if not ws_cfg.get("scanned"):
            logger.info(f"workspace_start: project_id={project_id} 首次启动，执行自动扫描")
            ws_cfg = await self.scan_project_structure(project_id)
        
        # 获取前端配置
        frontend_entry = ws_cfg.get("frontend_entry", "web")
        start_command = ws_cfg.get("start_command", "npm run dev")
        preferred_port = p.workspace_port or ws_cfg.get("port", 5173)
        
        logger.info(
            f"workspace_start: project_id={project_id}, "
            f"frontend_entry={frontend_entry}, start_command={start_command}, port={preferred_port}"
        )
        
        return get_workspace_process_service().start(
            project_id,
            p.path,
            preferred_port=preferred_port,
            frontend_entry=frontend_entry if frontend_entry else None,
            start_command=start_command,
        )

    def workspace_stop(self, project_id: int) -> dict[str, Any]:
        return get_workspace_process_service().stop(project_id)

    async def workspace_restart(self, project_id: int) -> dict[str, Any]:
        """重启 Workspace，使用配置中的前端设置"""
        p = await self.repo.get(project_id)
        if not p:
            raise ValueError("项目不存在")
        
        root = str(Path(p.path).expanduser().resolve())
        cfg = pfs.read_claude_config(root) or {}
        ws_cfg = cfg.get("workspace", {})
        
        frontend_entry = ws_cfg.get("frontend_entry", "web")
        start_command = ws_cfg.get("start_command", "npm run dev")
        preferred_port = p.workspace_port or ws_cfg.get("port", 5173)
        
        return get_workspace_process_service().restart(
            project_id,
            p.path,
            preferred_port=preferred_port,
            frontend_entry=frontend_entry if frontend_entry else None,
            start_command=start_command,
        )

    async def bind_agent(self, project_id: int, agent_id: int) -> Project:
        """
        绑定 Agent 到 Project

        Args:
            project_id: 项目 ID
            agent_id: Agent ID

        Returns:
            更新后的 Project
        """
        from app.repositories.agent_repository import AgentRepository
        
        p = await self.repo.get(project_id)
        if not p:
            raise ValueError("项目不存在")
        
        # 验证 Agent 存在
        agent_repo = AgentRepository(self.session)
        agent = await agent_repo.get_by_id(agent_id)
        if not agent:
            raise ValueError("Agent 不存在")
        
        p.agent_id = agent_id
        p.updated_at = datetime.utcnow()
        await self.session.commit()
        await self.session.refresh(p)
        
        logger.info(f"bind_agent: project_id={project_id}, agent_id={agent_id}")
        return p

    async def unbind_agent(self, project_id: int) -> Project:
        """
        解绑 Project 的 Agent

        Args:
            project_id: 项目 ID

        Returns:
            更新后的 Project
        """
        p = await self.repo.get(project_id)
        if not p:
            raise ValueError("项目不存在")
        
        old_agent_id = p.agent_id
        p.agent_id = None
        p.updated_at = datetime.utcnow()
        await self.session.commit()
        await self.session.refresh(p)
        
        logger.info(f"unbind_agent: project_id={project_id}, old_agent_id={old_agent_id}")
        return p

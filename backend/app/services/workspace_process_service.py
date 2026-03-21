"""
管理各 Project 的前端开发服务器子进程（内存注册表，进程重启后失效）。

支持可配置的前端入口目录和启动命令，首次启动时自动扫描项目结构。
"""
from __future__ import annotations

import logging
import os
import shlex
import socket
import subprocess
import time
import urllib.request
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


def _pick_free_port(preferred: Optional[int] = None) -> int:
    if preferred and preferred > 0:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("127.0.0.1", preferred))
                return preferred
            except OSError:
                pass
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return int(s.getsockname()[1])


@dataclass
class WorkspaceRuntime:
    popen: subprocess.Popen
    port: int
    started_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    cwd: str = ""


# project_id -> runtime
_registry: dict[int, WorkspaceRuntime] = {}


class WorkspaceProcessService:
    """启动 / 停止 `npm run dev`，并做简单 HTTP 探活。"""

    def status(self, project_id: int) -> dict:
        rt = _registry.get(project_id)
        if not rt:
            return {
                "running": False,
                "url": None,
                "port": None,
                "pid": None,
                "started_at": None,
                "health": "unknown",
                "last_error": None,
                "phase": "stopped",
            }
        code = rt.popen.poll()
        if code is not None:
            del _registry[project_id]
            return {
                "running": False,
                "url": None,
                "port": rt.port,
                "pid": None,
                "started_at": rt.started_at.isoformat(),
                "health": "unhealthy",
                "last_error": f"进程已退出 code={code}",
                "phase": "error",
            }
        url = f"http://127.0.0.1:{rt.port}"
        health = "unknown"
        last_error = None
        try:
            req = urllib.request.Request(url, method="GET")
            with urllib.request.urlopen(req, timeout=2) as resp:
                health = "healthy" if 200 <= resp.status < 500 else "unhealthy"
        except Exception as e:
            health = "unhealthy"
            last_error = str(e)[:200]

        return {
            "running": True,
            "url": url,
            "port": rt.port,
            "pid": rt.popen.pid,
            "started_at": rt.started_at.isoformat(),
            "health": health,
            "last_error": last_error,
            "phase": "starting" if health != "healthy" else "running",
        }

    def start(
        self,
        project_id: int,
        project_path: str,
        preferred_port: Optional[int] = None,
        frontend_entry: Optional[str] = None,
        start_command: Optional[str] = None,
    ) -> dict:
        """
        启动 Workspace 开发服务器

        Args:
            project_id: 项目 ID
            project_path: 项目根目录路径
            preferred_port: 首选端口，不可用时自动分配
            frontend_entry: 前端入口目录（相对于项目根目录），如 "web"、"frontend"、""（根目录）
            start_command: 启动命令，如 "npm run dev"、"pnpm dev"
        """
        root = Path(project_path).expanduser().resolve()
        
        # 确定前端入口目录
        if frontend_entry is None:
            frontend_entry = "web"  # 默认值
        
        if frontend_entry:
            work_dir = root / frontend_entry
        else:
            work_dir = root
            
        if not work_dir.is_dir():
            raise ValueError(f"前端入口目录不存在: {work_dir}")
        
        pkg = work_dir / "package.json"
        if not pkg.is_file():
            raise ValueError(f"package.json 不存在: {pkg}")

        if project_id in _registry:
            st = self.status(project_id)
            if st["running"]:
                return st

        port = _pick_free_port(preferred_port)
        env = os.environ.copy()
        
        # 解析启动命令
        if start_command is None:
            start_command = "npm run dev"
        
        # 构建命令行，添加端口参数
        # 支持常见的框架端口参数格式
        base_cmd = shlex.split(start_command)
        
        # 根据框架类型添加端口参数
        if "vite" in start_command or "dev" in start_command:
            # Vite 风格：-- --host --port
            cmd = base_cmd + ["--", "--host", "127.0.0.1", "--port", str(port)]
        elif "next" in start_command:
            # Next.js 风格：-p
            cmd = base_cmd + ["-p", str(port)]
        elif "nuxt" in start_command:
            # Nuxt 风格：--port
            cmd = base_cmd + ["--port", str(port)]
        else:
            # 通用：尝试 Vite 风格
            cmd = base_cmd + ["--", "--host", "127.0.0.1", "--port", str(port)]
        
        logger.info(f"Starting workspace: cwd={work_dir}, cmd={cmd}")
        
        try:
            popen = subprocess.Popen(
                cmd,
                cwd=str(work_dir),
                env=env,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                stdin=subprocess.DEVNULL,
                start_new_session=True,
            )
        except FileNotFoundError:
            # 尝试获取包管理器名称
            pm = base_cmd[0] if base_cmd else "npm"
            raise RuntimeError(f"未找到 {pm}，请安装 Node.js 并确保 {pm} 在 PATH 中")

        _registry[project_id] = WorkspaceRuntime(popen=popen, port=port, cwd=str(work_dir))
        time.sleep(0.5)
        return self.status(project_id)

    def stop(self, project_id: int) -> dict:
        rt = _registry.pop(project_id, None)
        if not rt:
            return {"success": True, "message": "无运行中的 Workspace"}
        try:
            rt.popen.terminate()
            try:
                rt.popen.wait(timeout=8)
            except subprocess.TimeoutExpired:
                rt.popen.kill()
        except Exception as e:
            logger.exception("workspace stop: %s", e)
            return {"success": False, "message": str(e)}
        return {"success": True, "message": "Workspace 已停止"}

    def restart(
        self,
        project_id: int,
        project_path: str,
        preferred_port: Optional[int] = None,
        frontend_entry: Optional[str] = None,
        start_command: Optional[str] = None,
    ) -> dict:
        self.stop(project_id)
        return self.start(
            project_id,
            project_path,
            preferred_port,
            frontend_entry,
            start_command,
        )


_workspace_service: Optional[WorkspaceProcessService] = None


def get_workspace_process_service() -> WorkspaceProcessService:
    global _workspace_service
    if _workspace_service is None:
        _workspace_service = WorkspaceProcessService()
    return _workspace_service

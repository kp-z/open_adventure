"""
项目目录探测：.claude/、web/、Git 信息与配置文件读写。
仅操作服务层，不跨层调用 API。
"""
from __future__ import annotations

import json
import logging
import os
import subprocess
from pathlib import Path
from typing import Any, Optional

logger = logging.getLogger(__name__)


def _is_git_repo(root: Path) -> bool:
    return (root / ".git").exists()


def scan_git_repositories(root_path: str, max_depth: int = 4) -> list[str]:
    """广度优先发现含 .git 的目录（路径字符串列表）。"""
    root = Path(root_path).expanduser().resolve()
    if not root.is_dir():
        return []
    found: list[str] = []
    seen: set[Path] = set()
    # (path, depth)
    queue: list[tuple[Path, int]] = [(root, 0)]
    while queue:
        cur, depth = queue.pop(0)
        if cur in seen:
            continue
        seen.add(cur)
        try:
            if not cur.is_dir():
                continue
            if _is_git_repo(cur):
                found.append(str(cur))
                continue
            if depth >= max_depth:
                continue
            for child in cur.iterdir():
                if child.name.startswith("."):
                    continue
                if child.is_dir():
                    queue.append((child, depth + 1))
        except PermissionError:
            logger.warning("scan_git_repositories: permission denied: %s", cur)
    return found


def probe_project_directory(project_path: str) -> dict[str, Any]:
    """
    扫描磁盘状态，返回用于更新 Project 索引的字段。

    Returns:
        has_agent, has_workspace, workspace_port (from config), git_remote, git_branch
    """
    root = Path(project_path).expanduser().resolve()
    out: dict[str, Any] = {
        "has_agent": False,
        "has_workspace": False,
        "workspace_port": None,
        "git_remote": None,
        "git_branch": None,
    }
    if not root.is_dir():
        return out

    agent_md = root / ".claude" / "agent.md"
    out["has_agent"] = agent_md.is_file()
    web_dir = root / "web"
    out["has_workspace"] = web_dir.is_dir() and (web_dir / "package.json").is_file()

    cfg = root / ".claude" / "config.json"
    if cfg.is_file():
        try:
            data = json.loads(cfg.read_text(encoding="utf-8"))
            ws = data.get("workspace") or {}
            if isinstance(ws, dict) and ws.get("port") is not None:
                out["workspace_port"] = int(ws["port"])
        except (json.JSONDecodeError, ValueError, TypeError) as e:
            logger.debug("probe_project_directory config.json: %s", e)

    if _is_git_repo(root):
        try:
            br = subprocess.run(
                ["git", "-C", str(root), "rev-parse", "--abbrev-ref", "HEAD"],
                capture_output=True,
                text=True,
                timeout=5,
            )
            if br.returncode == 0:
                out["git_branch"] = br.stdout.strip()
        except (FileNotFoundError, subprocess.TimeoutExpired, OSError) as e:
            logger.debug("git branch: %s", e)
        try:
            rem = subprocess.run(
                ["git", "-C", str(root), "remote", "get-url", "origin"],
                capture_output=True,
                text=True,
                timeout=5,
            )
            if rem.returncode == 0:
                out["git_remote"] = rem.stdout.strip()
        except (FileNotFoundError, subprocess.TimeoutExpired, OSError):
            pass

    return out


def read_claude_config(project_path: str) -> Optional[dict[str, Any]]:
    cfg = Path(project_path).expanduser().resolve() / ".claude" / "config.json"
    if not cfg.is_file():
        return None
    try:
        return json.loads(cfg.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None


def is_workspace_config_scanned(project_path: str) -> bool:
    """
    是否已完成「结构扫描」并写入 workspace（与 web/ 是否存在无关）。

    列表页 INIT / ENTER 应依据本字段：has_workspace 只表示磁盘上是否有 web/package.json。
    """
    cfg = read_claude_config(project_path)
    if not cfg:
        return False
    ws = cfg.get("workspace")
    if not isinstance(ws, dict):
        return False
    return bool(ws.get("scanned"))


def write_claude_config(project_path: str, data: dict[str, Any]) -> None:
    root = Path(project_path).expanduser().resolve()
    claude = root / ".claude"
    claude.mkdir(parents=True, exist_ok=True)
    cfg = claude / "config.json"
    cfg.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def read_agent_md(project_path: str) -> Optional[str]:
    p = Path(project_path).expanduser().resolve() / ".claude" / "agent.md"
    if not p.is_file():
        return None
    return p.read_text(encoding="utf-8")


def write_agent_md(project_path: str, content: str) -> None:
    root = Path(project_path).expanduser().resolve()
    d = root / ".claude"
    d.mkdir(parents=True, exist_ok=True)
    (d / "agent.md").write_text(content, encoding="utf-8")


def default_agent_markdown(project_name: str, project_path: str) -> str:
    return f"""# {project_name} 管家

## 角色定义

你是项目 **{project_name}** 的默认管理 Agent，负责：

- 管理项目代码和配置
- 回答关于项目的问题
- 执行开发和维护任务
- 按需创建或修改 `web/` 下的 Workspace 前端（独立 npm 项目）

## 项目信息

- **路径**: `{project_path}`

## 权限

- 完全访问项目目录内文件
- 可在项目根目录执行 shell 命令（遵循用户与安全策略）

## 工作目录限制

仅限操作项目根目录及其子目录；禁止访问项目外的路径。
"""


def merge_config(base: dict[str, Any], patch: dict[str, Any]) -> dict[str, Any]:
    """浅合并 patch 到 base 的顶层键；嵌套 dict 递归合并一层 workspace/agent。"""
    out = dict(base)
    for k, v in patch.items():
        if k in ("workspace", "agent") and isinstance(v, dict) and isinstance(out.get(k), dict):
            merged = dict(out[k])
            merged.update(v)
            out[k] = merged
        else:
            out[k] = v
    return out


def init_workspace_minimal(project_path: str, project_name: str = "Workspace") -> str:
    """
    在项目根下创建最小 Vite（vanilla TS）web/ 模块，用户需自行 npm install。

    Returns:
        web 目录绝对路径
    """
    root = Path(project_path).expanduser().resolve()
    web = root / "web"
    pkg = web / "package.json"
    if web.is_dir() and pkg.is_file():
        return str(web)

    web.mkdir(parents=True, exist_ok=True)
    (web / "src").mkdir(exist_ok=True)

    safe_name = "".join(c if c.isalnum() or c in "-_" else "-" for c in project_name)[:40] or "workspace"

    pkg.write_text(
        json.dumps(
            {
                "name": f"oa-{safe_name.lower()}",
                "private": True,
                "version": "0.0.1",
                "type": "module",
                "scripts": {"dev": "vite --host 127.0.0.1"},
                "devDependencies": {"typescript": "^5.4.0", "vite": "^5.4.0"},
            },
            indent=2,
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )
    (web / "index.html").write_text(
        """<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Project Workspace</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
""",
        encoding="utf-8",
    )
    (web / "vite.config.ts").write_text(
        """import { defineConfig } from 'vite';

export default defineConfig({
  server: { strictPort: false },
});
""",
        encoding="utf-8",
    )
    (web / "tsconfig.json").write_text(
        """{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
""",
        encoding="utf-8",
    )
    title_json = json.dumps(project_name, ensure_ascii=False)
    (web / "src" / "main.ts").write_text(
        f"""const el = document.querySelector<HTMLDivElement>('#app');
const TITLE = {title_json};
if (el) {{
  el.innerHTML = `
    <main style="font-family:system-ui;padding:2rem;background:#0a0a0a;color:#e0e0e0;min-height:100vh;">
      <h1 style="letter-spacing:0.08em;">${{TITLE}}</h1>
      <p style="color:#888;">Open Adventure Workspace（最小模板）。运行 <code>npm install && npm run dev</code> 后刷新。</p>
    </main>
  `;
}}
""",
        encoding="utf-8",
    )
    (web / ".gitignore").write_text("node_modules\ndist\n", encoding="utf-8")
    return str(web)


def suggest_workspace_url_from_filesystem(project_path: str, port: int) -> str:
    """根据 config 或默认端口给出预览 URL（供前端 iframe）。"""
    cfg = read_claude_config(project_path)
    if cfg:
        ws = cfg.get("workspace") or {}
        if isinstance(ws, dict) and ws.get("url"):
            return str(ws["url"])
    return f"http://127.0.0.1:{port}"


def scan_project_structure(project_path: str) -> dict[str, Any]:
    """
    扫描项目结构，识别前端入口和配置

    扫描逻辑：
    1. 查找 package.json 文件位置（根目录、web/、frontend/ 等）
    2. 检测框架（vite.config、next.config 等）
    3. 解析 package.json scripts
    4. 识别包管理器（npm、pnpm、yarn）
    5. 返回推荐配置

    Returns:
        workspace 配置字典
    """
    from datetime import datetime

    root = Path(project_path).expanduser().resolve()
    result: dict[str, Any] = {
        "scanned": True,
        "scanned_at": datetime.utcnow().isoformat(),
        "enabled": False,
        "port": 5173,
        "auto_start": False,
    }

    if not root.is_dir():
        return result

    # 常见的前端入口目录
    frontend_dirs = [".", "web", "frontend", "client", "app", "src", "packages/web", "packages/frontend"]
    
    for dir_name in frontend_dirs:
        check_dir = root / dir_name if dir_name != "." else root
        pkg_json = check_dir / "package.json"
        
        if pkg_json.is_file():
            result["frontend_entry"] = dir_name if dir_name != "." else ""
            result["enabled"] = True
            
            # 解析 package.json
            try:
                pkg_data = json.loads(pkg_json.read_text(encoding="utf-8"))
                scripts = pkg_data.get("scripts", {})
                deps = pkg_data.get("dependencies", {})
                dev_deps = pkg_data.get("devDependencies", {})
                all_deps = {**deps, **dev_deps}
                
                # 检测框架
                if "vite" in all_deps:
                    result["framework"] = "vite"
                elif "next" in all_deps:
                    result["framework"] = "next"
                elif "nuxt" in all_deps:
                    result["framework"] = "nuxt"
                elif "@angular/core" in all_deps:
                    result["framework"] = "angular"
                elif "vue" in all_deps:
                    result["framework"] = "vue"
                elif "react" in all_deps:
                    result["framework"] = "react"
                else:
                    result["framework"] = "unknown"
                
                # 检测启动命令
                if "dev" in scripts:
                    result["start_command"] = "npm run dev"
                elif "start" in scripts:
                    result["start_command"] = "npm start"
                elif "serve" in scripts:
                    result["start_command"] = "npm run serve"
                else:
                    result["start_command"] = "npm run dev"
                    
            except (json.JSONDecodeError, KeyError, TypeError) as e:
                logger.debug("scan_project_structure parse package.json: %s", e)
                result["start_command"] = "npm run dev"
            
            break
    
    # 检测包管理器
    if (root / "pnpm-lock.yaml").is_file():
        result["package_manager"] = "pnpm"
        if result.get("start_command"):
            result["start_command"] = result["start_command"].replace("npm", "pnpm")
    elif (root / "yarn.lock").is_file():
        result["package_manager"] = "yarn"
        if result.get("start_command"):
            result["start_command"] = result["start_command"].replace("npm", "yarn")
    elif (root / "bun.lockb").is_file():
        result["package_manager"] = "bun"
        if result.get("start_command"):
            result["start_command"] = result["start_command"].replace("npm", "bun")
    else:
        result["package_manager"] = "npm"
    
    logger.info(f"scan_project_structure: {project_path} -> {result}")
    return result


def get_workspace_config(project_path: str) -> dict[str, Any]:
    """
    获取项目的 workspace 配置
    
    Returns:
        workspace 配置字典
    """
    cfg = read_claude_config(project_path)
    if cfg and "workspace" in cfg:
        return cfg["workspace"]
    return {
        "enabled": False,
        "scanned": False,
    }

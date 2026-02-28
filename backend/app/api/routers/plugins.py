"""
Plugin API Router

提供 Plugin 列表和创建功能
"""
import json
import re
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/plugins", tags=["plugins"])


class Plugin(BaseModel):
    """Plugin 信息"""
    name: str = Field(..., description="Plugin 名称")
    path: str = Field(..., description="Plugin 路径")


class PluginCreate(BaseModel):
    """创建 Plugin 请求"""
    name: str = Field(..., min_length=1, max_length=100, description="Plugin 名称")
    description: Optional[str] = Field(None, max_length=500, description="Plugin 描述")
    author: Optional[str] = Field(None, max_length=100, description="作者名称")


class PluginListResponse(BaseModel):
    """Plugin 列表响应"""
    items: List[Plugin]


@router.get("", response_model=PluginListResponse)
async def list_plugins():
    """
    获取所有已安装的 Plugin 列表

    扫描 ~/.claude/plugins/ 目录，返回所有 plugin 的名称和路径
    """
    plugins_dir = Path.home() / ".claude" / "plugins"

    if not plugins_dir.exists():
        return PluginListResponse(items=[])

    plugins = []

    # 过滤系统文件和非目录
    exclude_names = {".DS_Store", "cache", "__pycache__"}

    for item in plugins_dir.iterdir():
        # 跳过非目录和系统文件
        if not item.is_dir() or item.name in exclude_names or item.name.startswith("."):
            continue

        # 验证是否是有效的 plugin（包含 .claude-plugin 目录）
        plugin_manifest_dir = item / ".claude-plugin"
        if not plugin_manifest_dir.exists():
            continue

        plugins.append(Plugin(
            name=item.name,
            path=str(item)
        ))

    # 按名称排序
    plugins.sort(key=lambda p: p.name)

    return PluginListResponse(items=plugins)


@router.post("", response_model=Plugin)
async def create_plugin(data: PluginCreate):
    """
    创建新的 Plugin

    创建 plugin 目录结构：
    - ~/.claude/plugins/{plugin_name}/
    - .claude-plugin/plugin.json
    - agents/
    - skills/
    - README.md
    """
    # 验证 plugin 名称格式（小写字母、数字、连字符，必须以字母开头）
    if not re.match(r'^[a-z][a-z0-9-]*$', data.name):
        raise HTTPException(
            status_code=400,
            detail="Plugin 名称格式错误：只能包含小写字母、数字和连字符，且必须以字母开头"
        )

    plugins_dir = Path.home() / ".claude" / "plugins"
    plugin_dir = plugins_dir / data.name

    # 检查 plugin 是否已存在
    if plugin_dir.exists():
        raise HTTPException(
            status_code=409,
            detail=f"Plugin '{data.name}' 已存在"
        )

    try:
        # 创建 plugin 根目录
        plugin_dir.mkdir(parents=True, exist_ok=False)

        # 创建 .claude-plugin 目录和 manifest
        manifest_dir = plugin_dir / ".claude-plugin"
        manifest_dir.mkdir(exist_ok=True)

        manifest = {
            "name": data.name,
            "description": data.description or f"Custom plugin: {data.name}",
            "version": "1.0.0",
            "author": {
                "name": data.author or "Unknown"
            }
        }

        manifest_file = manifest_dir / "plugin.json"
        manifest_file.write_text(json.dumps(manifest, indent=2, ensure_ascii=False))

        # 创建 agents 和 skills 目录
        (plugin_dir / "agents").mkdir(exist_ok=True)
        (plugin_dir / "skills").mkdir(exist_ok=True)

        # 创建 README.md
        readme_content = f"""# {data.name}

{data.description or 'Custom Claude Code plugin'}

## Installation

```bash
claude --plugin-dir {plugin_dir}
```

## Structure

- `agents/` - Agent definitions
- `skills/` - Skill definitions
- `.claude-plugin/plugin.json` - Plugin manifest
"""
        (plugin_dir / "README.md").write_text(readme_content)

        return Plugin(
            name=data.name,
            path=str(plugin_dir)
        )

    except Exception as e:
        # 清理已创建的目录
        if plugin_dir.exists():
            import shutil
            shutil.rmtree(plugin_dir)

        raise HTTPException(
            status_code=500,
            detail=f"创建 Plugin 失败: {str(e)}"
        )

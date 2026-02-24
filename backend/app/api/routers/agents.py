"""
Agent API Router - Claude Code Subagent 管理

提供子代理的完整生命周期管理：
- 同步本地 agents
- CRUD 操作
- 使用 Claude 生成
- 文件内容读写
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pathlib import Path

from app.core.database import get_db
from app.repositories.agent_repository import AgentRepository
from app.services.agent_service import AgentService
from app.adapters.claude.file_scanner import ClaudeFileScanner
from app.config.settings import settings
from app.schemas.agent import (
    AgentCreate,
    AgentUpdate,
    AgentResponse,
    AgentListResponse,
    AgentSyncRequest,
    AgentSyncResponse,
    AgentGenerateRequest,
    AgentGenerateResponse,
    AgentFileContent
)

router = APIRouter(prefix="/agents", tags=["agents"])


def get_agent_service(db: AsyncSession = Depends(get_db)) -> AgentService:
    """Dependency to get agent service"""
    repository = AgentRepository(db)
    return AgentService(repository)


@router.post(
    "/sync",
    response_model=AgentSyncResponse,
    summary="同步本地子代理"
)
async def sync_agents(
    request: AgentSyncRequest = None,
    service: AgentService = Depends(get_agent_service)
):
    """
    从本地文件系统同步所有子代理到数据库

    扫描范围：
    - 用户级: ~/.claude/agents/
    - 项目级: .claude/agents/ (按优先级检测: 请求参数 > 环境变量 > 自动检测)
    - 插件级: ~/.claude/plugins/*/agents/
    - 内置: Explore, Plan, General-purpose 等
    """
    import os
    scanner = ClaudeFileScanner()

    # 按优先级确定项目路径：
    # 1. 请求参数中指定的 project_path
    # 2. 配置/环境变量中的 PROJECT_PATH
    # 3. 自动检测当前工作目录及其父目录
    project_path = None

    # 优先级 1: 请求参数
    if request and request.project_path:
        project_path = request.project_path

    # 优先级 2: 配置/环境变量
    if not project_path and settings.project_path:
        project_path = settings.project_path

    # 优先级 3: 自动检测
    if not project_path:
        cwd = os.getcwd()
        # 检查当前目录、父目录、祖父目录
        for check_path in [cwd, os.path.dirname(cwd), os.path.dirname(os.path.dirname(cwd))]:
            if os.path.exists(os.path.join(check_path, ".claude", "agents")):
                project_path = check_path
                break

    scanned_agents = await scanner.scan_agents(project_path=project_path)

    # 如果不包含内置 agents，过滤掉
    if request and not request.include_builtin:
        scanned_agents = [a for a in scanned_agents if not a.get("is_builtin", False)]

    # 同步到数据库
    result = await service.sync_agents(scanned_agents)

    return AgentSyncResponse(
        synced=result["synced"],
        created=result["created"],
        updated=result["updated"],
        deleted=result["deleted"],
        errors=result.get("errors", [])
    )


@router.post(
    "",
    response_model=AgentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="创建新子代理"
)
async def create_agent(
    agent_data: AgentCreate,
    service: AgentService = Depends(get_agent_service)
):
    """
    创建新的子代理

    会在对应作用域目录下创建 Markdown 文件
    """
    # 创建文件和数据库记录
    return await service.create_agent(agent_data)


@router.get(
    "",
    response_model=AgentListResponse,
    summary="列出所有子代理"
)
async def list_agents(
    skip: int = Query(0, ge=0, description="跳过数量"),
    limit: int = Query(100, ge=1, le=1000, description="返回数量"),
    scope: Optional[str] = Query(None, description="过滤作用域: builtin, user, project, plugin"),
    active_only: bool = Query(False, description="仅返回激活的（未被覆盖的）"),
    service: AgentService = Depends(get_agent_service)
):
    """列出所有子代理，支持按作用域过滤"""
    return await service.list_agents(
        skip=skip,
        limit=limit,
        scope=scope,
        active_only=active_only
    )


@router.get(
    "/search",
    response_model=AgentListResponse,
    summary="搜索子代理"
)
async def search_agents(
    q: str = Query(..., min_length=1, description="搜索关键词"),
    skip: int = Query(0, ge=0, description="跳过数量"),
    limit: int = Query(100, ge=1, le=1000, description="返回数量"),
    service: AgentService = Depends(get_agent_service)
):
    """按名称或描述搜索子代理"""
    return await service.search_agents(query=q, skip=skip, limit=limit)


@router.get(
    "/scopes",
    summary="获取作用域统计"
)
async def get_scope_stats(
    service: AgentService = Depends(get_agent_service)
):
    """获取各作用域的子代理数量统计"""
    return await service.get_scope_stats()


@router.get(
    "/{agent_id}",
    response_model=AgentResponse,
    summary="获取子代理详情"
)
async def get_agent(
    agent_id: int,
    service: AgentService = Depends(get_agent_service)
):
    """获取单个子代理的详细信息"""
    return await service.get_agent(agent_id)


@router.get(
    "/{agent_id}/content",
    response_model=AgentFileContent,
    summary="获取子代理文件内容"
)
async def get_agent_content(
    agent_id: int,
    service: AgentService = Depends(get_agent_service)
):
    """
    获取子代理的原始文件内容

    返回完整的 Markdown 文件内容（YAML frontmatter + body）
    用于编辑器展示
    """
    agent = await service.get_agent(agent_id)

    if agent.is_builtin:
        raise HTTPException(
            status_code=400,
            detail="内置子代理不支持编辑"
        )

    file_path = agent.meta.get("path") if agent.meta else None
    if not file_path:
        raise HTTPException(
            status_code=404,
            detail="未找到子代理文件路径"
        )

    path = Path(file_path)
    if not path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"文件不存在: {file_path}"
        )

    content = path.read_text(encoding="utf-8")

    # 解析 frontmatter 和 body
    frontmatter = {}
    body = content

    if content.startswith("---"):
        parts = content.split("---", 2)
        if len(parts) >= 3:
            try:
                import yaml
                frontmatter = yaml.safe_load(parts[1]) or {}
                body = parts[2].strip()
            except Exception:
                pass

    return AgentFileContent(
        path=str(path),
        content=content,
        frontmatter=frontmatter,
        body=body
    )


@router.put(
    "/{agent_id}",
    response_model=AgentResponse,
    summary="更新子代理"
)
async def update_agent(
    agent_id: int,
    agent_data: AgentUpdate,
    service: AgentService = Depends(get_agent_service)
):
    """更新子代理配置"""
    return await service.update_agent(agent_id, agent_data)


@router.put(
    "/{agent_id}/content",
    response_model=AgentResponse,
    summary="更新子代理文件内容"
)
async def update_agent_content(
    agent_id: int,
    content: AgentFileContent,
    service: AgentService = Depends(get_agent_service)
):
    """
    直接更新子代理的文件内容

    会覆盖原始 Markdown 文件
    """
    agent = await service.get_agent(agent_id)

    if agent.is_builtin:
        raise HTTPException(
            status_code=400,
            detail="内置子代理不支持编辑"
        )

    file_path = agent.meta.get("path") if agent.meta else None
    if not file_path:
        raise HTTPException(
            status_code=400,
            detail="未找到子代理文件路径"
        )

    path = Path(file_path)

    # 写入文件
    path.write_text(content.content, encoding="utf-8")

    # 重新同步这个 agent
    scanner = ClaudeFileScanner()

    # 根据文件类型解析
    if path.suffix == ".md":
        updated_data = await scanner._parse_agent_markdown(
            path,
            scope=agent.scope,
            priority=agent.priority
        )
    else:
        updated_data = await scanner._parse_agent_json(
            path,
            scope=agent.scope,
            priority=agent.priority
        )

    if updated_data:
        # 更新数据库记录
        from app.schemas.agent import AgentUpdate
        update_schema = AgentUpdate(**{
            k: v for k, v in updated_data.items()
            if k not in ["is_builtin", "scope", "priority"]
        })
        return await service.update_agent(agent_id, update_schema)

    return await service.get_agent(agent_id)


@router.delete(
    "/{agent_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除子代理"
)
async def delete_agent(
    agent_id: int,
    delete_file: bool = Query(True, description="是否同时删除文件"),
    service: AgentService = Depends(get_agent_service)
):
    """
    删除子代理

    可选择是否同时删除对应的文件
    """
    agent = await service.get_agent(agent_id)

    if agent.is_builtin:
        raise HTTPException(
            status_code=400,
            detail="内置子代理不支持删除"
        )

    # 删除文件
    if delete_file:
        file_path = agent.meta.get("path") if agent.meta else None
        if file_path:
            path = Path(file_path)
            if path.exists():
                path.unlink()

    # 删除数据库记录
    await service.delete_agent(agent_id)


@router.post(
    "/{agent_id}/test",
    summary="测试子代理"
)
async def test_agent(
    agent_id: int,
    prompt: str = Query(..., description="测试提示"),
    service: AgentService = Depends(get_agent_service)
):
    """
    运行子代理进行测试

    调用 Claude CLI 使用指定的子代理处理提示
    """
    import subprocess
    import os
    import time

    agent = await service.get_agent(agent_id)
    cli_path = os.environ.get("CLAUDECODE", "claude")

    start_time = time.time()

    try:
        # 构建带有子代理配置的提示
        system_context = ""
        if agent.system_prompt:
            system_context = f"\n\n[Agent System Prompt]\n{agent.system_prompt}\n\n"

        full_prompt = f"""You are acting as the subagent "{agent.name}".
Description: {agent.description}
{system_context}
User Request: {prompt}

Please respond according to your role and capabilities."""

        cmd = [
            cli_path,
            "-p", full_prompt,
            "--output-format", "text",
            "--disable-slash-commands",
            "--setting-sources", "user"
        ]

        # 如果指定了模型，添加模型参数
        if agent.model and agent.model != "inherit":
            cmd.extend(["--model", agent.model])

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=180
        )

        duration = time.time() - start_time

        if result.returncode != 0:
            return {
                "success": False,
                "output": f"Agent 执行失败: {result.stderr}",
                "duration": duration,
                "model": agent.model or "inherit"
            }

        return {
            "success": True,
            "output": result.stdout.strip(),
            "duration": duration,
            "model": agent.model or "inherit"
        }

    except subprocess.TimeoutExpired:
        duration = time.time() - start_time
        return {
            "success": False,
            "output": "执行超时（超过 3 分钟）",
            "duration": duration,
            "model": agent.model or "inherit"
        }
    except FileNotFoundError:
        return {
            "success": False,
            "output": "未找到 Claude CLI，请确保已安装",
            "duration": 0,
            "model": agent.model or "inherit"
        }
    except Exception as e:
        duration = time.time() - start_time
        return {
            "success": False,
            "output": f"执行错误: {str(e)}",
            "duration": duration,
            "model": agent.model or "inherit"
        }


@router.post(
    "/generate",
    response_model=AgentGenerateResponse,
    summary="使用 Claude 生成子代理"
)
async def generate_agent(
    request: AgentGenerateRequest
):
    """
    使用 Claude 生成子代理配置

    类似 /agents 命令的 "Generate with Claude" 功能
    """
    import subprocess
    import re
    import os

    cli_path = os.environ.get("CLAUDECODE", "claude")

    # 构建生成提示
    generation_prompt = f"""Generate a Claude Code subagent configuration based on this description:

{request.prompt}

Create a complete subagent in Markdown format with YAML frontmatter. The response should be ONLY the Markdown file content, starting with --- and ending after the system prompt.

Follow these rules:
1. name: lowercase letters and hyphens only, descriptive
2. description: clear explanation of when Claude should delegate to this subagent
3. tools: list only necessary tools (Read, Write, Edit, Bash, Grep, Glob)
4. model: use "{request.model}" or "inherit"
5. System prompt in the body: detailed instructions for the subagent's behavior

{"Use read-only tools only (no Write, Edit)." if request.tools_preset == "readonly" else ""}

Example format:
---
name: code-reviewer
description: Expert code reviewer. Use proactively after code changes.
tools: Read, Grep, Glob, Bash
model: sonnet
---

You are a senior code reviewer. When invoked:
1. Run git diff to see recent changes
2. Focus on modified files
3. Provide specific, actionable feedback
"""

    try:
        cmd = [
            cli_path,
            "-p", generation_prompt,
            "--output-format", "text",
            "--disable-slash-commands",
            "--setting-sources", "user"
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120
        )

        if result.returncode != 0:
            raise HTTPException(
                status_code=500,
                detail=f"Claude CLI 错误: {result.stderr}"
            )

        output = result.stdout.strip()

        # 提取 Markdown 内容
        md_match = re.search(r'(---[\s\S]*?)(?:```|$)', output)
        if md_match:
            markdown_content = md_match.group(1).strip()
        else:
            # 尝试找到以 --- 开头的内容
            if "---" in output:
                idx = output.index("---")
                markdown_content = output[idx:].strip()
            else:
                markdown_content = output

        # 解析 frontmatter
        frontmatter = {}
        body = markdown_content

        if markdown_content.startswith("---"):
            parts = markdown_content.split("---", 2)
            if len(parts) >= 3:
                try:
                    import yaml
                    frontmatter = yaml.safe_load(parts[1]) or {}
                    body = parts[2].strip()
                except Exception:
                    pass

        name = frontmatter.get("name", "new-agent")
        tools_raw = frontmatter.get("tools", [])
        if isinstance(tools_raw, str):
            tools = [t.strip() for t in tools_raw.split(",")]
        else:
            tools = tools_raw

        return AgentGenerateResponse(
            name=name,
            description=frontmatter.get("description", ""),
            system_prompt=body,
            model=frontmatter.get("model", "inherit"),
            tools=tools,
            suggested_filename=f"{name}.md",
            preview_content=markdown_content
        )

    except subprocess.TimeoutExpired:
        raise HTTPException(
            status_code=504,
            detail="生成超时，请稍后重试"
        )
    except FileNotFoundError:
        raise HTTPException(
            status_code=500,
            detail="未找到 Claude CLI，请确保已安装"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"生成失败: {str(e)}"
        )


@router.post(
    "/generate/save",
    response_model=AgentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="保存生成的子代理"
)
async def save_generated_agent(
    content: str,
    scope: str = Query("user", description="保存位置: user 或 project"),
    project_path: Optional[str] = Query(None, description="项目路径（scope=project 时必填）"),
    service: AgentService = Depends(get_agent_service)
):
    """保存由 Claude 生成的子代理到文件"""
    import yaml

    # 解析内容获取名称
    frontmatter = {}
    if content.startswith("---"):
        parts = content.split("---", 2)
        if len(parts) >= 3:
            try:
                frontmatter = yaml.safe_load(parts[1]) or {}
            except Exception:
                pass

    name = frontmatter.get("name", "new-agent")
    filename = f"{name}.md"

    # 确定保存路径
    if scope == "project":
        if not project_path:
            raise HTTPException(
                status_code=400,
                detail="项目级子代理需要提供 project_path"
            )
        agents_dir = Path(project_path) / ".claude" / "agents"
    else:
        agents_dir = settings.claude_config_dir / "agents"

    # 创建目录
    agents_dir.mkdir(parents=True, exist_ok=True)

    # 写入文件
    file_path = agents_dir / filename
    file_path.write_text(content, encoding="utf-8")

    # 同步到数据库
    scanner = ClaudeFileScanner()
    agent_data = await scanner._parse_agent_markdown(
        file_path,
        scope=scope,
        priority=3 if scope == "user" else 2
    )

    if agent_data:
        create_data = AgentCreate(
            name=agent_data["name"],
            description=agent_data["description"],
            system_prompt=agent_data.get("system_prompt"),
            model=agent_data.get("model", "inherit"),
            tools=agent_data.get("tools", []),
            disallowed_tools=agent_data.get("disallowed_tools", []),
            permission_mode=agent_data.get("permission_mode", "default"),
            skills=agent_data.get("skills", []),
            scope=scope,
            meta=agent_data.get("meta", {})
        )
        return await service.create_agent(create_data)

    raise HTTPException(
        status_code=500,
        detail="保存后解析失败"
    )

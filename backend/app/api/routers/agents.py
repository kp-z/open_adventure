"""
Agent API Router - Claude Code Subagent 管理

提供子代理的完整生命周期管理：
- 同步本地 agents
- CRUD 操作
- 使用 Claude 生成
- 文件内容读写
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query, status, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from pathlib import Path

from app.core.database import get_db
from app.repositories.agent_repository import AgentRepository
from app.repositories.executions_repo import ExecutionRepository
from app.services.agent_service import AgentService
from app.services.agent_test_service import AgentTestService
from app.adapters.claude.file_scanner import ClaudeFileScanner
from app.config.settings import settings
from app.models.task import ExecutionStatus
from datetime import datetime
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
    service: AgentService = Depends(get_agent_service),
    db: AsyncSession = Depends(get_db)
):
    """
    从本地文件系统同步所有子代理到数据库

    扫描范围：
    - 用户级: ~/.claude/agents/
    - 项目级: 配置的项目路径下的 .claude/agents/
    - 插件级: ~/.claude/plugins/*/agents/
    - 内置: Explore, Plan, General-purpose 等
    """
    from pathlib import Path
    from app.repositories.project_path_repository import ProjectPathRepository

    scanner = ClaudeFileScanner()
    project_path_repo = ProjectPathRepository(db)

    # 获取启用的项目路径配置
    enabled_paths = await project_path_repo.get_enabled_paths()
    project_paths = [
        {
            "path": p.path,
            "alias": p.alias or Path(p.path).name,
            "recursive_scan": p.recursive_scan
        }
        for p in enabled_paths
    ]

    scanned_agents = await scanner.scan_agents(project_paths=project_paths)

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
    "/categories",
    summary="Get agent categories and subcategories"
)
async def get_agent_categories(
    service: AgentService = Depends(get_agent_service)
):
    """Get all agent categories with their subcategories (plugins and projects)"""
    agents = await service.list_agents(skip=0, limit=10000)

    # Count by scope
    counts = {
        "builtin": 0,
        "user": 0,
        "project": 0,
        "plugin": 0
    }

    # Collect unique plugins and projects
    plugins = {}  # plugin_name -> count
    projects = {}  # project_name -> count

    for agent in agents.items:
        scope = agent.scope.value if hasattr(agent.scope, 'value') else agent.scope
        counts[scope] = counts.get(scope, 0) + 1

        # Extract plugin name
        if scope == "plugin" and agent.meta:
            plugin_name = agent.meta.get("plugin_name", "unknown")
            if plugin_name and plugin_name != "unknown":
                plugins[plugin_name] = plugins.get(plugin_name, 0) + 1

        # Extract project name from path
        if scope == "project" and agent.meta:
            path = agent.meta.get("path", "")
            if path:
                # Extract project directory name from path
                parts = Path(path).parts
                if ".claude" in parts:
                    claude_index = parts.index(".claude")
                    if claude_index > 0:
                        project_name = parts[claude_index - 1]
                        projects[project_name] = projects.get(project_name, 0) + 1

    return {
        "counts": counts,
        "plugins": [
            {"id": name, "name": name, "count": count}
            for name, count in sorted(plugins.items())
        ],
        "projects": [
            {"id": name, "name": name, "count": count}
            for name, count in sorted(projects.items())
        ]
    }



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
    "/categories",
    summary="获取分类和子分类"
)
async def get_categories(
    service: AgentService = Depends(get_agent_service)
):
    """
    获取子代理的分类统计和子分类列表

    返回：
    - counts: 各作用域的数量统计
    - plugins: 插件子分类列表
    - projects: 项目子分类列表
    """
    return await service.get_categories()


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
    "/{agent_id}/test-stream",
    summary="测试子代理（流式输出）"
)
async def test_agent_stream(
    agent_id: int,
    prompt: str = Query(..., description="测试提示"),
    service: AgentService = Depends(get_agent_service),
    db: AsyncSession = Depends(get_db)
):
    """
    运行子代理进行测试，实时流式输出日志

    返回 SSE (Server-Sent Events) 格式的流
    """
    import os
    import time
    import json
    import asyncio
    from app.adapters.claude.cli_client import ClaudeCliClient

    agent = await service.get_agent(agent_id)
    cli_path = settings.claude_cli_path

    # 创建 Execution 记录
    agent_test_service = AgentTestService(db)
    execution = await agent_test_service.create_agent_test_execution(
        agent_id=agent_id,
        test_input=prompt
    )
    execution_id = execution.id

    async def generate_stream():
        start_time = time.time()

        try:
            # 更新执行状态为 RUNNING
            execution_repo = ExecutionRepository(db)
            execution = await execution_repo.get(execution_id)
            execution.status = ExecutionStatus.RUNNING
            execution.started_at = datetime.utcnow()
            await db.commit()

            # 发送开始日志
            yield f"data: {json.dumps({'type': 'log', 'message': f'开始执行 Agent: {agent.name}'})}\n\n"

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

            model_name = agent.model or "inherit"
            yield f"data: {json.dumps({'type': 'log', 'message': f'使用模型: {model_name}'})}\n\n"
            yield f"data: {json.dumps({'type': 'log', 'message': '执行命令...'})}\n\n"

            # 使用队列来传递日志
            log_queue = asyncio.Queue()
            execution_done = asyncio.Event()

            # 定义日志回调函数
            def log_callback(stream_type: str, line: str):
                # 将日志放入队列
                asyncio.create_task(log_queue.put((stream_type, line)))

            # 在后台执行命令
            async def run_command():
                try:
                    # 创建环境变量副本，移除 CLAUDECODE
                    import os
                    env = os.environ.copy()
                    env.pop("CLAUDECODE", None)

                    client = ClaudeCliClient()
                    result = await client.run_command_with_streaming(
                        cmd=cmd,
                        log_callback=log_callback,
                        timeout=180,
                        env=env
                    )
                    # 将结果放入队列
                    await log_queue.put(('result', result))
                except Exception as e:
                    await log_queue.put(('error', str(e)))
                finally:
                    execution_done.set()

            # 启动后台任务
            asyncio.create_task(run_command())

            # 持续从队列中读取日志并推送
            result_data = None
            while not execution_done.is_set() or not log_queue.empty():
                try:
                    # 等待日志消息，超时 0.1 秒
                    item = await asyncio.wait_for(log_queue.get(), timeout=0.1)

                    if item[0] == 'result':
                        result_data = item[1]
                        break
                    elif item[0] == 'error':
                        yield f"data: {json.dumps({'type': 'error', 'message': f'执行错误: {item[1]}'})}\n\n"
                        return
                    else:
                        # 推送日志
                        stream_type, line = item
                        yield f"data: {json.dumps({'type': 'log', 'message': line})}\n\n"

                except asyncio.TimeoutError:
                    # 超时，继续等待
                    continue

            # 发送完成消息并更新 Execution 状态
            if result_data:
                execution_repo = ExecutionRepository(db)
                execution = await execution_repo.get(execution_id)

                if result_data["success"]:
                    # 更新为成功状态
                    execution.status = ExecutionStatus.SUCCEEDED
                    execution.test_output = result_data['output']
                    execution.finished_at = datetime.utcnow()
                    await db.commit()

                    yield f"data: {json.dumps({'type': 'complete', 'data': {'success': True, 'output': result_data['output'], 'duration': result_data['duration'], 'model': model_name}})}\n\n"
                else:
                    # 更新为失败状态
                    error_msg = f"Agent 执行失败: {result_data['error']}"
                    execution.status = ExecutionStatus.FAILED
                    execution.error_message = result_data['error']
                    execution.test_output = error_msg
                    execution.finished_at = datetime.utcnow()
                    await db.commit()

                    yield f"data: {json.dumps({'type': 'complete', 'data': {'success': False, 'output': error_msg, 'duration': result_data['duration'], 'model': model_name}})}\n\n"

        except FileNotFoundError:
            # 更新为失败状态
            execution_repo = ExecutionRepository(db)
            execution = await execution_repo.get(execution_id)
            execution.status = ExecutionStatus.FAILED
            execution.error_message = '未找到 Claude CLI，请确保已安装'
            execution.finished_at = datetime.utcnow()
            await db.commit()

            yield f"data: {json.dumps({'type': 'error', 'message': '未找到 Claude CLI，请确保已安装'})}\n\n"
        except Exception as e:
            # 更新为失败状态
            duration = time.time() - start_time
            execution_repo = ExecutionRepository(db)
            execution = await execution_repo.get(execution_id)
            execution.status = ExecutionStatus.FAILED
            execution.error_message = str(e)
            execution.finished_at = datetime.utcnow()
            await db.commit()

            yield f"data: {json.dumps({'type': 'error', 'message': f'执行错误: {str(e)}'})}\n\n"

    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


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

    cli_path = settings.claude_cli_path

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

        # 创建环境变量副本，移除 CLAUDECODE 以避免嵌套会话检测
        env = os.environ.copy()
        env.pop("CLAUDECODE", None)

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120,
            env=env
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


@router.post(
    "/cleanup-duplicates",
    summary="清理重复的子代理记录"
)
async def cleanup_duplicate_agents(
    dry_run: bool = Query(True, description="是否仅统计不删除"),
    db: AsyncSession = Depends(get_db)
):
    """
    清理数据库中重复的子代理记录

    重复定义：相同 scope + path 的记录

    Args:
        dry_run: True 时仅统计，False 时执行删除

    Returns:
        清理报告
    """
    from sqlalchemy import select, func
    from app.models.agent import Agent

    # 查找重复记录
    # 按 scope + path 分组，找出数量 > 1 的组
    stmt = (
        select(
            Agent.scope,
            func.json_extract(Agent.meta, '$.path').label('path'),
            func.count().label('count')
        )
        .where(Agent.meta.isnot(None))
        .group_by(Agent.scope, func.json_extract(Agent.meta, '$.path'))
        .having(func.count() > 1)
    )

    result = await db.execute(stmt)
    duplicates = result.all()

    if not duplicates:
        return {
            "success": True,
            "message": "没有发现重复记录",
            "duplicates_found": 0,
            "records_to_delete": 0,
            "deleted": 0
        }

    # 统计需要删除的记录数
    total_to_delete = 0
    duplicate_groups = []

    for scope, path, count in duplicates:
        # 对于每个重复组，保留最新的一条，删除其他的
        records_to_delete = count - 1
        total_to_delete += records_to_delete

        duplicate_groups.append({
            "scope": scope,
            "path": path,
            "total_count": count,
            "to_delete": records_to_delete
        })

    if dry_run:
        return {
            "success": True,
            "message": "统计完成（未执行删除）",
            "duplicates_found": len(duplicates),
            "records_to_delete": total_to_delete,
            "duplicate_groups": duplicate_groups,
            "deleted": 0
        }

    # 执行删除
    deleted_count = 0
    deleted_records = []

    for scope, path, count in duplicates:
        # 查找该组的所有记录，按 ID 排序
        stmt = (
            select(Agent)
            .where(
                Agent.scope == scope,
                func.json_extract(Agent.meta, '$.path') == path
            )
            .order_by(Agent.id.desc())  # 最新的在前
        )

        result = await db.execute(stmt)
        records = result.scalars().all()

        # 保留第一条（最新的），删除其他的
        for record in records[1:]:
            deleted_records.append({
                "id": record.id,
                "name": record.name,
                "scope": record.scope,
                "path": path
            })
            await db.delete(record)
            deleted_count += 1

    await db.commit()

    return {
        "success": True,
        "message": f"成功清理 {deleted_count} 条重复记录",
        "duplicates_found": len(duplicates),
        "records_to_delete": total_to_delete,
        "deleted": deleted_count,
        "deleted_records": deleted_records
    }


@router.websocket("/{agent_id}/terminal")
async def agent_terminal(
    agent_id: int,
    websocket: WebSocket,
    service: AgentService = Depends(get_agent_service)
):
    """Agent 终端 WebSocket 端点"""
    import json
    from app.api.websocket.terminal import TerminalSession

    await websocket.accept()
    print(f"[AgentTerminal] WebSocket connection accepted for agent {agent_id}")

    try:
        # 获取 agent 信息
        agent = await service.get_agent(agent_id)
        if not agent:
            await websocket.send_json({
                'type': 'error',
                'message': f'Agent {agent_id} not found'
            })
            await websocket.close()
            return

        # 构建 Claude CLI 命令
        cli_path = settings.claude_cli_path

        # 构建带有子代理配置的提示
        system_context = ""
        if agent.system_prompt:
            system_context = f"\n\n[Agent System Prompt]\n{agent.system_prompt}\n\n"

        # 创建一个交互式会话命令
        # 使用 bash 作为 shell，保持交互式
        # 在 bash 中运行 claude 命令
        claude_args = '--setting-sources user'
        if agent.model and agent.model != "inherit":
            claude_args += f' --model {agent.model}'

        # 使用 bash -i 启动交互式 shell
        agent_command = f'bash -i'

        print(f"[AgentTerminal] Starting agent session with command: {agent_command}")
        print(f"[AgentTerminal] Claude CLI path: {cli_path}")
        print(f"[AgentTerminal] Claude args: {claude_args}")

        session = TerminalSession(agent_id, agent.name, agent_command)

        try:
            await session.start(websocket)
            print(f"[AgentTerminal] Session started, entering message loop")

            # 改进的 WebSocket 循环 - 不依赖 session.running
            # 而是依赖 WebSocket 连接状态
            while True:
                try:
                    # 使用超时来避免无限阻塞
                    data = await asyncio.wait_for(websocket.receive_text(), timeout=1.0)
                    message = json.loads(data)
                    print(f"[AgentTerminal] Received message: {message.get('type')}")

                    if message['type'] == 'input':
                        await session.write_input(message['data'])
                    elif message['type'] == 'resize':
                        await session.resize(message['cols'], message['rows'])
                    elif message['type'] == 'close':
                        print(f"[AgentTerminal] Received close message")
                        break
                except asyncio.TimeoutError:
                    # 超时是正常的，继续循环
                    # 检查 session 是否还在运行
                    if not session.running:
                        print(f"[AgentTerminal] Session stopped running")
                        # 不立即退出，等待用户关闭或继续接收消息
                        pass
                    continue
                except WebSocketDisconnect:
                    print(f"[AgentTerminal] WebSocket disconnected for agent {agent_id}")
                    break
                except Exception as e:
                    print(f"[AgentTerminal] Error processing message: {e}")
                    import traceback
                    traceback.print_exc()
                    break

            print(f"[AgentTerminal] Exiting message loop")

        except Exception as e:
            print(f"[AgentTerminal] Session error: {e}")
            await websocket.send_json({
                'type': 'error',
                'message': str(e)
            })
        finally:
            session.close()

    except Exception as e:
        print(f"[AgentTerminal] WebSocket error: {e}")
        try:
            await websocket.send_json({
                'type': 'error',
                'message': str(e)
            })
        except:
            pass
    finally:
        try:
            await websocket.close()
        except:
            pass


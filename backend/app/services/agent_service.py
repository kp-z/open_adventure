"""
Agent Service - Claude Code Subagent 业务逻辑层
"""
from typing import Optional, List, Dict, Any
from pathlib import Path
import yaml

from app.repositories.agent_repository import AgentRepository
from app.schemas.agent import (
    AgentCreate,
    AgentUpdate,
    AgentResponse,
    AgentListResponse
)
from app.core.exceptions import NotFoundException, ConflictException
from app.config.settings import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class AgentService:
    """Service for agent business logic"""

    def __init__(self, repository: AgentRepository):
        self.repository = repository

    async def create_agent(self, agent_data: AgentCreate) -> AgentResponse:
        """
        创建新的子代理

        同时创建文件和数据库记录
        """
        # 确定保存路径
        if agent_data.scope == "project":
            # 项目级需要在 meta 中指定项目路径
            project_path = agent_data.meta.get("project_path") if agent_data.meta else None
            if not project_path:
                raise ConflictException("项目级子代理需要在 meta 中指定 project_path")
            agents_dir = Path(project_path) / ".claude" / "agents"
        else:
            agents_dir = settings.claude_config_dir / "agents"

        # 创建目录
        agents_dir.mkdir(parents=True, exist_ok=True)

        # 生成文件名
        filename = f"{agent_data.name}.md"
        file_path = agents_dir / filename

        # 检查文件是否已存在
        if file_path.exists():
            raise ConflictException(f"文件已存在: {file_path}")

        # 生成 Markdown 内容
        markdown_content = self._generate_markdown_content(agent_data)

        # 写入文件
        file_path.write_text(markdown_content, encoding="utf-8")
        logger.info(f"Created agent file: {file_path}")

        # 更新 meta 中的路径
        meta = agent_data.meta or {}
        meta["path"] = str(file_path)
        meta["file_format"] = "markdown"

        # 创建数据库记录
        create_data = agent_data.model_dump()
        create_data["meta"] = meta
        create_data["is_builtin"] = False
        create_data["is_active"] = True
        create_data["is_overridden"] = False

        agent = await self.repository.create(AgentCreate(**create_data))
        return AgentResponse.model_validate(agent)

    def _generate_markdown_content(self, agent_data: AgentCreate) -> str:
        """生成子代理的 Markdown 文件内容"""
        # 构建 frontmatter
        frontmatter = {
            "name": agent_data.name,
            "description": agent_data.description
        }

        # 添加可选字段
        if agent_data.tools:
            frontmatter["tools"] = ", ".join(agent_data.tools)

        if agent_data.disallowed_tools:
            frontmatter["disallowedTools"] = ", ".join(agent_data.disallowed_tools)

        if agent_data.model and agent_data.model != "inherit":
            frontmatter["model"] = agent_data.model

        if agent_data.permission_mode and agent_data.permission_mode != "default":
            frontmatter["permissionMode"] = agent_data.permission_mode

        if agent_data.max_turns:
            frontmatter["maxTurns"] = agent_data.max_turns

        if agent_data.skills:
            frontmatter["skills"] = agent_data.skills

        if agent_data.mcp_servers:
            frontmatter["mcpServers"] = agent_data.mcp_servers

        if agent_data.hooks:
            frontmatter["hooks"] = agent_data.hooks

        if agent_data.memory:
            frontmatter["memory"] = agent_data.memory

        if agent_data.background:
            frontmatter["background"] = True

        if agent_data.isolation:
            frontmatter["isolation"] = agent_data.isolation

        # 生成 YAML
        yaml_content = yaml.dump(
            frontmatter,
            default_flow_style=False,
            allow_unicode=True,
            sort_keys=False
        )

        # 组合完整内容
        system_prompt = agent_data.system_prompt or ""
        return f"---\n{yaml_content}---\n\n{system_prompt}"

    async def get_agent(self, agent_id: int) -> AgentResponse:
        """获取子代理详情"""
        agent = await self.repository.get_by_id(agent_id)
        if not agent:
            raise NotFoundException(f"Agent with id {agent_id} not found")
        return AgentResponse.model_validate(agent)

    async def get_agent_by_name(self, name: str) -> AgentResponse:
        """通过名称获取子代理"""
        agent = await self.repository.get_by_name(name)
        if not agent:
            raise NotFoundException(f"Agent with name '{name}' not found")
        return AgentResponse.model_validate(agent)

    async def list_agents(
        self,
        skip: int = 0,
        limit: int = 100,
        scope: Optional[str] = None,
        active_only: bool = False
    ) -> AgentListResponse:
        """列出所有子代理"""
        agents, total = await self.repository.get_all(
            skip=skip,
            limit=limit,
            scope=scope,
            active_only=active_only
        )

        # 获取各作用域统计
        scope_counts = await self.repository.get_scope_counts()

        return AgentListResponse(
            total=total,
            items=[AgentResponse.model_validate(agent) for agent in agents],
            builtin_count=scope_counts.get("builtin", 0),
            user_count=scope_counts.get("user", 0),
            project_count=scope_counts.get("project", 0),
            plugin_count=scope_counts.get("plugin", 0)
        )

    async def update_agent(self, agent_id: int, agent_data: AgentUpdate) -> AgentResponse:
        """更新子代理"""
        agent = await self.repository.get_by_id(agent_id)
        if not agent:
            raise NotFoundException(f"Agent with id {agent_id} not found")

        # 内置 agent 不允许修改
        if agent.is_builtin:
            raise ConflictException("内置子代理不支持修改")

        # 更新数据库
        updated_agent = await self.repository.update(agent_id, agent_data)

        # 如果有文件路径，同步更新文件
        file_path = agent.meta.get("path") if agent.meta else None
        if file_path and Path(file_path).exists():
            # 重新生成文件内容
            merged_data = agent_data.model_dump(exclude_unset=True)
            for key, value in merged_data.items():
                if value is None:
                    merged_data[key] = getattr(agent, key)

            # 构建完整的创建数据来生成 Markdown
            create_data = AgentCreate(
                name=merged_data.get("name", agent.name),
                description=merged_data.get("description", agent.description),
                system_prompt=merged_data.get("system_prompt", agent.system_prompt),
                model=merged_data.get("model", agent.model),
                tools=merged_data.get("tools", agent.tools or []),
                disallowed_tools=merged_data.get("disallowed_tools", agent.disallowed_tools or []),
                permission_mode=merged_data.get("permission_mode", agent.permission_mode),
                max_turns=merged_data.get("max_turns", agent.max_turns),
                skills=merged_data.get("skills", agent.skills or []),
                mcp_servers=merged_data.get("mcp_servers", agent.mcp_servers or []),
                hooks=merged_data.get("hooks", agent.hooks),
                memory=merged_data.get("memory", agent.memory),
                background=merged_data.get("background", agent.background),
                isolation=merged_data.get("isolation", agent.isolation),
                scope=agent.scope,
                meta=agent.meta
            )

            markdown_content = self._generate_markdown_content(create_data)
            Path(file_path).write_text(markdown_content, encoding="utf-8")
            logger.info(f"Updated agent file: {file_path}")

        return AgentResponse.model_validate(updated_agent)

    async def delete_agent(self, agent_id: int) -> None:
        """删除子代理"""
        agent = await self.repository.get_by_id(agent_id)
        if not agent:
            raise NotFoundException(f"Agent with id {agent_id} not found")

        if agent.is_builtin:
            raise ConflictException("内置子代理不支持删除")

        success = await self.repository.delete(agent_id)
        if not success:
            raise NotFoundException(f"Agent with id {agent_id} not found")

    async def search_agents(
        self,
        query: str,
        skip: int = 0,
        limit: int = 100
    ) -> AgentListResponse:
        """搜索子代理"""
        agents, total = await self.repository.search(query, skip=skip, limit=limit)

        # 获取各作用域统计
        scope_counts = await self.repository.get_scope_counts()

        return AgentListResponse(
            total=total,
            items=[AgentResponse.model_validate(agent) for agent in agents],
            builtin_count=scope_counts.get("builtin", 0),
            user_count=scope_counts.get("user", 0),
            project_count=scope_counts.get("project", 0),
            plugin_count=scope_counts.get("plugin", 0)
        )

    async def get_scope_stats(self) -> Dict[str, int]:
        """获取各作用域的子代理数量统计"""
        return await self.repository.get_scope_counts()

    async def get_categories(self) -> Dict[str, Any]:
        """
        获取子代理的分类统计和子分类列表

        返回：
        - counts: 各作用域的数量统计
        - plugins: 插件子分类列表 [{id, name, count}]
        - projects: 项目子分类列表 [{id, name, count}]
        """
        # 获取基础统计
        counts = await self.repository.get_scope_counts()

        # 获取所有 agents
        all_agents, _ = await self.repository.get_all(skip=0, limit=10000)

        # 统计插件子分类
        plugin_counts: Dict[str, int] = {}
        for agent in all_agents:
            if agent.scope == "plugin" and agent.meta:
                plugin_name = agent.meta.get("plugin_name")
                if plugin_name:
                    plugin_counts[plugin_name] = plugin_counts.get(plugin_name, 0) + 1

        plugins = [
            {"id": name, "name": name, "count": count}
            for name, count in sorted(plugin_counts.items())
        ]

        # 统计项目子分类
        project_counts: Dict[str, int] = {}
        for agent in all_agents:
            if agent.scope == "project" and agent.meta:
                path = agent.meta.get("path", "")
                # 从路径中提取项目名称
                parts = path.split("/")
                if ".claude" in parts:
                    claude_index = parts.index(".claude")
                    if claude_index > 0:
                        project_name = parts[claude_index - 1]
                        project_counts[project_name] = project_counts.get(project_name, 0) + 1

        projects = [
            {"id": name, "name": name, "count": count}
            for name, count in sorted(project_counts.items())
        ]

        return {
            "counts": counts,
            "plugins": plugins,
            "projects": projects
        }

    async def sync_agents(self, scanned_agents: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        同步扫描到的子代理到数据库

        Args:
            scanned_agents: 从文件系统扫描到的子代理列表

        Returns:
            Dict: {"synced": int, "created": int, "updated": int, "deleted": int, "errors": []}
        """
        errors = []
        scanned_paths = set()

        # 收集所有扫描到的路径和内置 agent 名称
        for agent in scanned_agents:
            path = agent.get("meta", {}).get("path", "")
            if path:
                scanned_paths.add(path)
            elif agent.get("is_builtin"):
                # 内置 agent 用 name + scope 作为标识
                scanned_paths.add(f"builtin:{agent['name']}")

        try:
            # 批量更新/插入
            result = await self.repository.bulk_upsert(scanned_agents)

            # 获取所有数据库中的 agents
            all_agents, _ = await self.repository.get_all(skip=0, limit=10000)

            # 找出需要删除的（在数据库中但不在扫描结果中）
            deleted = 0
            for agent in all_agents:
                path = agent.meta.get("path", "") if agent.meta else ""
                builtin_key = f"builtin:{agent.name}" if agent.is_builtin else ""

                if path and path not in scanned_paths:
                    await self.repository.delete(agent.id)
                    deleted += 1
                    logger.info(f"Deleted stale agent: {agent.name} ({path})")
                elif builtin_key and builtin_key not in scanned_paths:
                    await self.repository.delete(agent.id)
                    deleted += 1
                    logger.info(f"Deleted stale builtin agent: {agent.name}")

            return {
                "synced": len(scanned_agents),
                "created": result["created"],
                "updated": result["updated"],
                "deleted": deleted,
                "errors": errors
            }

        except Exception as e:
            logger.error(f"Error syncing agents: {e}")
            errors.append(str(e))
            return {
                "synced": 0,
                "created": 0,
                "updated": 0,
                "deleted": 0,
                "errors": errors
            }

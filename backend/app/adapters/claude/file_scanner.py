"""
Claude File Scanner

扫描本地 Claude Code 文件系统，提取 skills/agents/agent teams 信息
"""
import json
from pathlib import Path
from typing import List, Dict, Any, Optional

from app.config.settings import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class ClaudeFileScanner:
    """Claude 文件系统扫描器"""

    def __init__(self):
        self.config_dir = settings.claude_config_dir
        self.skills_dir = settings.claude_skills_dir
        self.plugins_dir = settings.claude_plugins_dir

    async def scan_skills(self) -> List[Dict[str, Any]]:
        """
        扫描所有技能

        扫描路径：
        1. ~/.claude/skills/ (全局技能)
        2. 项目目录 .claude/skills/ (项目技能)
        3. plugins/*/skills/ (插件技能)

        注意：不再去重，同名 skill 全部保留并标记为重复

        Returns:
            List[Dict]: 技能列表（含重复标记）
        """
        skills = []

        # 步骤 1: 扫描全局技能
        if self.skills_dir.exists():
            global_skills = await self._scan_skills_in_dir(
                self.skills_dir,
                source="global"
            )
            skills.extend(global_skills)
            logger.info(f"Found {len(global_skills)} global skills")

        # 步骤 2: 扫描插件技能
        if self.plugins_dir.exists():
            plugin_skills = await self._scan_plugin_skills()
            skills.extend(plugin_skills)
            logger.info(f"Found {len(plugin_skills)} plugin skills")

        # TODO: 扫描项目技能（需要知道当前项目路径）

        # 步骤 3: 标记重复的技能
        skills = self._mark_duplicate_skills(skills)

        logger.info(f"Total skills: {len(skills)}")
        return skills

    def _mark_duplicate_skills(self, skills: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        标记重复的技能

        对于同名 skill，在 meta 中添加：
        - is_duplicate: bool - 是否有重复
        - duplicate_count: int - 同名 skill 数量
        - duplicate_locations: List[str] - 所有同名 skill 的位置

        Args:
            skills: 技能列表

        Returns:
            List[Dict]: 添加了重复标记的技能列表
        """
        from collections import defaultdict

        # 步骤 1: 统计每个名称出现的次数和位置
        name_to_skills = defaultdict(list)
        for idx, skill in enumerate(skills):
            name_to_skills[skill["name"]].append({
                "index": idx,
                "source": skill.get("source", "unknown"),
                "path": skill.get("meta", {}).get("path", ""),
                "plugin_name": skill.get("meta", {}).get("plugin_name", "")
            })

        # 步骤 2: 为每个 skill 添加重复标记
        for skill in skills:
            name = skill["name"]
            duplicates = name_to_skills[name]
            count = len(duplicates)

            if "meta" not in skill:
                skill["meta"] = {}

            if count > 1:
                # 有重复
                skill["meta"]["is_duplicate"] = True
                skill["meta"]["duplicate_count"] = count
                # 收集所有重复的位置信息
                locations = []
                for dup in duplicates:
                    if dup["source"] == "plugin" and dup["plugin_name"]:
                        locations.append(f"plugin:{dup['plugin_name']}")
                    elif dup["source"] == "global":
                        locations.append("global")
                    elif dup["source"] == "project":
                        locations.append("project")
                    else:
                        locations.append(dup["source"])
                skill["meta"]["duplicate_locations"] = locations
            else:
                # 无重复
                skill["meta"]["is_duplicate"] = False
                skill["meta"]["duplicate_count"] = 1
                skill["meta"]["duplicate_locations"] = []

        return skills

    async def _scan_skills_in_dir(
        self,
        directory: Path,
        source: str
    ) -> List[Dict[str, Any]]:
        """
        扫描指定目录中的技能

        Args:
            directory: 目录路径
            source: 来源标识（global/plugin/project）

        Returns:
            List[Dict]: 技能列表
        """
        skills = []

        try:
            for skill_dir in directory.iterdir():
                if not skill_dir.is_dir():
                    continue

                skill_data = await self._parse_skill(skill_dir, source)
                if skill_data:
                    skills.append(skill_data)

        except Exception as e:
            logger.error(f"Error scanning skills in {directory}: {e}")

        return skills

    async def _parse_skill(
        self,
        skill_dir: Path,
        source: str
    ) -> Optional[Dict[str, Any]]:
        """
        解析单个技能目录

        Args:
            skill_dir: 技能目录路径
            source: 来源标识

        Returns:
            Dict: 技能数据，如果解析失败返回 None
        """
        try:
            skill_name = skill_dir.name

            # 查找技能定义文件（可能是 skill.md 或 skill.yaml）
            skill_md = skill_dir / "skill.md"
            skill_yaml = skill_dir / "skill.yaml"
            skill_json = skill_dir / "skill.json"

            description = ""
            skill_type = "command"
            tags = []
            meta = {}

            # 优先读取 YAML/JSON 配置
            if skill_yaml.exists():
                import yaml
                with open(skill_yaml, "r", encoding="utf-8") as f:
                    config = yaml.safe_load(f)
                    description = config.get("description", "")
                    skill_type = config.get("type", "command")
                    tags = config.get("tags", [])
                    meta = config.get("meta", {})

            elif skill_json.exists():
                with open(skill_json, "r", encoding="utf-8") as f:
                    config = json.load(f)
                    description = config.get("description", "")
                    skill_type = config.get("type", "command")
                    tags = config.get("tags", [])
                    meta = config.get("meta", {})

            elif skill_md.exists():
                # 从 Markdown 文件提取描述
                with open(skill_md, "r", encoding="utf-8") as f:
                    content = f.read()
                    
                    # 步骤 1: 尝试解析 YAML front matter (--- 包围的部分)
                    if content.startswith("---"):
                        parts = content.split("---", 2)
                        if len(parts) >= 3:
                            try:
                                import yaml
                                front_matter = yaml.safe_load(parts[1])
                                if front_matter and isinstance(front_matter, dict):
                                    description = front_matter.get("description", "")
                                    skill_type = front_matter.get("type", skill_type)
                                    tags = front_matter.get("tags", tags)
                                    # 合并 front matter 中的其他元数据
                                    for key, value in front_matter.items():
                                        if key not in ["name", "description", "type", "tags"]:
                                            meta[key] = value
                            except Exception as e:
                                logger.warning(f"Failed to parse YAML front matter in {skill_md}: {e}")
                    
                    # 步骤 2: 如果没有从 front matter 获取描述，尝试从正文提取
                    if not description:
                        lines = content.split("\n")
                        for line in lines:
                            line = line.strip()
                            # 跳过空行、标题行和 front matter 分隔符
                            if line and not line.startswith("#") and line != "---":
                                description = line
                                break

            # 如果没有描述，使用目录名
            if not description:
                description = skill_name.replace("_", " ").replace("-", " ").title()

            return {
                "name": skill_name,
                "full_name": f"{source}/{skill_name}",
                "type": skill_type,
                "description": description,
                "tags": tags,
                "source": source,
                "enabled": True,
                "meta": {
                    **meta,
                    "path": str(skill_dir)
                }
            }

        except Exception as e:
            logger.error(f"Error parsing skill {skill_dir}: {e}")
            return None

    async def _scan_plugin_skills(self, include_cache: bool = False) -> List[Dict[str, Any]]:
        """
        扫描所有插件中的技能
        
        扫描路径包括：
        1. ~/.claude/plugins/插件名/skills/ (直接插件)
        2. ~/.claude/plugins/marketplaces/市场名/plugins/插件名/skills/ (市场插件)
        3. ~/.claude/plugins/cache/插件名/版本号/skills/ (缓存插件，默认跳过)

        Args:
            include_cache: 是否包含 cache 目录中的 skills，默认 False

        Returns:
            List[Dict]: 插件技能列表
        """
        skills = []

        try:
            if not self.plugins_dir.exists():
                return skills

            # 递归查找所有 skills 目录
            for skills_dir in self.plugins_dir.rglob("skills"):
                if not skills_dir.is_dir():
                    continue
                
                # 跳过空目录
                if not any(skills_dir.iterdir()):
                    continue
                
                # 默认跳过 cache 目录
                if not include_cache and "/cache/" in str(skills_dir):
                    logger.debug(f"Skipping cache skill directory: {skills_dir}")
                    continue
                
                # 从路径中提取插件信息
                plugin_info = self._extract_plugin_info(skills_dir)
                
                plugin_skills = await self._scan_skills_in_dir(
                    skills_dir,
                    source="plugin"
                )
                
                # 在 meta 中记录插件信息（不再去重，保留所有）
                for skill in plugin_skills:
                    skill["meta"]["plugin_name"] = plugin_info.get("plugin_name", "unknown")
                    skill["meta"]["plugin_namespace"] = plugin_info.get("namespace", "")
                    skill["meta"]["plugin_version"] = plugin_info.get("version", "")
                    skills.append(skill)

        except Exception as e:
            logger.error(f"Error scanning plugin skills: {e}")

        return skills
    
    def _extract_plugin_info(self, skills_dir: Path) -> Dict[str, str]:
        """
        从 skills 目录路径中提取插件信息
        
        示例路径：
        - ~/.claude/plugins/claude-manager/skills -> plugin_name: claude-manager
        - ~/.claude/plugins/cache/superpowers/4.3.0/skills -> plugin_name: superpowers, version: 4.3.0
        - ~/.claude/plugins/marketplaces/official/plugins/figma/skills -> plugin_name: figma, namespace: official
        """
        parts = skills_dir.parts
        info = {"plugin_name": "unknown", "namespace": "", "version": ""}
        
        try:
            # 找到 plugins 目录的位置
            if "plugins" in parts:
                plugins_idx = len(parts) - 1 - parts[::-1].index("plugins")
                
                # 检查是否是 cache 路径
                if plugins_idx + 1 < len(parts) and parts[plugins_idx + 1] == "cache":
                    # 格式: plugins/cache/插件名/版本号/skills
                    if plugins_idx + 3 < len(parts):
                        info["plugin_name"] = parts[plugins_idx + 2]
                        info["version"] = parts[plugins_idx + 3]
                        info["namespace"] = "cache"
                
                # 检查是否是 marketplaces 路径
                elif plugins_idx + 1 < len(parts) and parts[plugins_idx + 1] == "marketplaces":
                    # 格式: plugins/marketplaces/市场名/plugins/插件名/skills
                    if "plugins" in parts[plugins_idx + 2:]:
                        inner_plugins_idx = plugins_idx + 2 + list(parts[plugins_idx + 2:]).index("plugins")
                        if inner_plugins_idx + 1 < len(parts):
                            info["plugin_name"] = parts[inner_plugins_idx + 1]
                            info["namespace"] = parts[plugins_idx + 2]  # 市场名
                
                # 直接插件目录
                else:
                    # 格式: plugins/插件名/skills
                    if plugins_idx + 1 < len(parts):
                        info["plugin_name"] = parts[plugins_idx + 1]
        
        except Exception as e:
            logger.warning(f"Failed to extract plugin info from {skills_dir}: {e}")
        
        return info

    async def scan_agents(self, project_path: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        扫描所有 Claude Code 子代理（Subagents）

        按照 Claude Code 官方规范扫描：
        1. 用户级: ~/.claude/agents/ (优先级 3)
        2. 项目级: .claude/agents/ (优先级 2)
        3. 插件级: plugins/*/agents/ (优先级 4)

        注意：CLI 级别（--agents 参数）只在运行时存在，不扫描

        Args:
            project_path: 项目路径，用于扫描项目级 agents

        Returns:
            List[Dict]: 子代理列表，包含所有作用域
        """
        agents = []

        # 步骤 1: 扫描用户级 agents (~/.claude/agents/)
        user_agents_dir = self.config_dir / "agents"
        if user_agents_dir.exists():
            user_agents = await self._scan_agents_in_dir(
                user_agents_dir,
                scope="user",
                priority=3
            )
            agents.extend(user_agents)
            logger.info(f"Found {len(user_agents)} user-level agents")

        # 步骤 2: 扫描项目级 agents (.claude/agents/)
        if project_path:
            project_agents_dir = Path(project_path) / ".claude" / "agents"
            if project_agents_dir.exists():
                project_agents = await self._scan_agents_in_dir(
                    project_agents_dir,
                    scope="project",
                    priority=2
                )
                agents.extend(project_agents)
                logger.info(f"Found {len(project_agents)} project-level agents")

        # 步骤 3: 扫描插件级 agents
        if self.plugins_dir.exists():
            plugin_agents = await self._scan_plugin_agents()
            agents.extend(plugin_agents)
            logger.info(f"Found {len(plugin_agents)} plugin-level agents")

        # 步骤 4: 添加内置 agents（Explore, Plan, General-purpose 等）
        builtin_agents = self._get_builtin_agents()
        agents.extend(builtin_agents)
        logger.info(f"Added {len(builtin_agents)} built-in agents")

        # 步骤 5: 标记重复的 agents（同名时高优先级覆盖低优先级）
        agents = self._mark_agent_overrides(agents)

        logger.info(f"Total agents: {len(agents)}")
        return agents

    def _get_builtin_agents(self) -> List[Dict[str, Any]]:
        """
        获取 Claude Code 内置子代理

        根据官方文档，内置子代理包括：
        - Explore: 快速只读搜索，使用 Haiku
        - Plan: 计划模式研究
        - General-purpose: 复杂多步骤任务
        - Bash: 终端命令
        """
        return [
            {
                "name": "Explore",
                "description": "Fast, read-only agent optimized for searching and analyzing codebases. Use for file discovery, code search, and codebase exploration.",
                "system_prompt": "You are a fast exploration agent. Search and analyze the codebase without making any changes. Return concise summaries of what you find.",
                "model": "haiku",
                "tools": ["Read", "Grep", "Glob"],
                "disallowed_tools": ["Write", "Edit"],
                "permission_mode": "plan",
                "scope": "builtin",
                "priority": 0,
                "is_builtin": True,
                "meta": {
                    "color": "#22c55e",
                    "icon": "search"
                }
            },
            {
                "name": "Plan",
                "description": "Research agent used during plan mode to gather context before presenting a plan.",
                "system_prompt": "You are a planning research agent. Gather context and information to help create implementation plans. Do not make any changes.",
                "model": "inherit",
                "tools": ["Read", "Grep", "Glob"],
                "disallowed_tools": ["Write", "Edit"],
                "permission_mode": "plan",
                "scope": "builtin",
                "priority": 0,
                "is_builtin": True,
                "meta": {
                    "color": "#8b5cf6",
                    "icon": "clipboard-list"
                }
            },
            {
                "name": "General-purpose",
                "description": "Capable agent for complex, multi-step tasks that require both exploration and action.",
                "system_prompt": "You are a general-purpose agent capable of both exploration and modification. Handle complex research, multi-step operations, and code changes.",
                "model": "inherit",
                "tools": [],
                "disallowed_tools": [],
                "permission_mode": "default",
                "scope": "builtin",
                "priority": 0,
                "is_builtin": True,
                "meta": {
                    "color": "#3b82f6",
                    "icon": "cpu"
                }
            },
            {
                "name": "Bash",
                "description": "Agent for running terminal commands in a separate context.",
                "system_prompt": "Execute terminal commands as requested. Report results clearly.",
                "model": "inherit",
                "tools": ["Bash"],
                "disallowed_tools": [],
                "permission_mode": "default",
                "scope": "builtin",
                "priority": 0,
                "is_builtin": True,
                "meta": {
                    "color": "#f97316",
                    "icon": "terminal"
                }
            }
        ]

    async def _scan_agents_in_dir(
        self,
        directory: Path,
        scope: str,
        priority: int
    ) -> List[Dict[str, Any]]:
        """
        扫描指定目录中的子代理

        支持 Markdown 文件（带 YAML frontmatter）和 JSON 文件

        Args:
            directory: 目录路径
            scope: 作用域（user/project/plugin）
            priority: 优先级（数字越小越高）

        Returns:
            List[Dict]: 子代理列表
        """
        agents = []

        try:
            # 扫描 .md 文件（官方推荐格式）
            for agent_file in directory.glob("*.md"):
                agent_data = await self._parse_agent_markdown(agent_file, scope, priority)
                if agent_data:
                    agents.append(agent_data)

            # 也支持 .json 文件（向后兼容）
            for agent_file in directory.glob("*.json"):
                agent_data = await self._parse_agent_json(agent_file, scope, priority)
                if agent_data:
                    agents.append(agent_data)

        except Exception as e:
            logger.error(f"Error scanning agents in {directory}: {e}")

        return agents

    async def _parse_agent_markdown(
        self,
        agent_file: Path,
        scope: str,
        priority: int
    ) -> Optional[Dict[str, Any]]:
        """
        解析 Markdown 格式的子代理文件

        格式：YAML frontmatter + Markdown body（系统提示）

        Args:
            agent_file: 代理文件路径
            scope: 作用域
            priority: 优先级

        Returns:
            Dict: 子代理数据
        """
        try:
            with open(agent_file, "r", encoding="utf-8") as f:
                content = f.read()

            # 解析 YAML frontmatter
            frontmatter = {}
            system_prompt = content

            if content.startswith("---"):
                parts = content.split("---", 2)
                if len(parts) >= 3:
                    try:
                        import yaml
                        frontmatter = yaml.safe_load(parts[1]) or {}
                        system_prompt = parts[2].strip()
                    except Exception as e:
                        logger.warning(f"Failed to parse YAML frontmatter in {agent_file}: {e}")

            # 提取配置项（按照 Claude Code 官方规范）
            name = frontmatter.get("name", agent_file.stem)
            
            # 处理 tools 字段（可以是字符串或列表）
            tools_raw = frontmatter.get("tools", [])
            if isinstance(tools_raw, str):
                tools = [t.strip() for t in tools_raw.split(",")]
            else:
                tools = tools_raw or []

            # 处理 disallowedTools 字段
            disallowed_raw = frontmatter.get("disallowedTools", [])
            if isinstance(disallowed_raw, str):
                disallowed_tools = [t.strip() for t in disallowed_raw.split(",")]
            else:
                disallowed_tools = disallowed_raw or []

            # 处理 skills 字段
            skills_raw = frontmatter.get("skills", [])
            if isinstance(skills_raw, str):
                skills = [s.strip() for s in skills_raw.split(",")]
            else:
                skills = skills_raw or []

            # 处理 mcpServers 字段
            mcp_servers = frontmatter.get("mcpServers", [])

            return {
                "name": name,
                "description": frontmatter.get("description", ""),
                "system_prompt": system_prompt,
                "model": frontmatter.get("model", "inherit"),
                "tools": tools,
                "disallowed_tools": disallowed_tools,
                "permission_mode": frontmatter.get("permissionMode", "default"),
                "max_turns": frontmatter.get("maxTurns"),
                "skills": skills,
                "mcp_servers": mcp_servers,
                "hooks": frontmatter.get("hooks", {}),
                "memory": frontmatter.get("memory"),
                "background": frontmatter.get("background", False),
                "isolation": frontmatter.get("isolation"),
                "scope": scope,
                "priority": priority,
                "is_builtin": False,
                "meta": {
                    "path": str(agent_file),
                    "color": frontmatter.get("color"),
                    "file_format": "markdown"
                }
            }

        except Exception as e:
            logger.error(f"Error parsing agent markdown {agent_file}: {e}")
            return None

    async def _parse_agent_json(
        self,
        agent_file: Path,
        scope: str,
        priority: int
    ) -> Optional[Dict[str, Any]]:
        """
        解析 JSON 格式的子代理文件（向后兼容）

        Args:
            agent_file: 代理文件路径
            scope: 作用域
            priority: 优先级

        Returns:
            Dict: 子代理数据
        """
        try:
            with open(agent_file, "r", encoding="utf-8") as f:
                config = json.load(f)

            return {
                "name": config.get("name", agent_file.stem),
                "description": config.get("description", ""),
                "system_prompt": config.get("prompt", config.get("system_prompt", "")),
                "model": config.get("model", "inherit"),
                "tools": config.get("tools", []),
                "disallowed_tools": config.get("disallowedTools", []),
                "permission_mode": config.get("permissionMode", "default"),
                "max_turns": config.get("maxTurns"),
                "skills": config.get("skills", []),
                "mcp_servers": config.get("mcpServers", []),
                "hooks": config.get("hooks", {}),
                "memory": config.get("memory"),
                "background": config.get("background", False),
                "isolation": config.get("isolation"),
                "scope": scope,
                "priority": priority,
                "is_builtin": False,
                "meta": {
                    "path": str(agent_file),
                    "color": config.get("color"),
                    "file_format": "json",
                    **config.get("meta", {})
                }
            }

        except Exception as e:
            logger.error(f"Error parsing agent json {agent_file}: {e}")
            return None

    def _get_enabled_plugins(self) -> Dict[str, str]:
        """
        从 settings.json 读取启用的插件列表

        Returns:
            Dict[str, str]: {插件名: marketplace名} 的映射
        """
        enabled_plugins = {}
        settings_file = self.config_dir / "settings.json"

        try:
            if settings_file.exists():
                with open(settings_file, "r", encoding="utf-8") as f:
                    settings = json.load(f)

                for plugin_key, is_enabled in settings.get("enabledPlugins", {}).items():
                    if is_enabled and "@" in plugin_key:
                        plugin_name, marketplace = plugin_key.rsplit("@", 1)
                        enabled_plugins[plugin_name] = marketplace

        except Exception as e:
            logger.warning(f"Failed to read enabled plugins from settings.json: {e}")

        return enabled_plugins

    def _get_latest_plugin_version(self, cache_dir: Path, plugin_name: str) -> Optional[Path]:
        """
        获取 cache 中插件的最新版本目录

        Args:
            cache_dir: cache 目录路径
            plugin_name: 插件名称

        Returns:
            最新版本的目录路径，如果不存在返回 None
        """
        plugin_cache_dir = cache_dir / plugin_name
        if not plugin_cache_dir.exists():
            return None

        # 获取所有版本目录，按修改时间排序取最新
        versions = [d for d in plugin_cache_dir.iterdir() if d.is_dir()]
        if not versions:
            return None

        # 按目录修改时间排序，取最新的
        versions.sort(key=lambda x: x.stat().st_mtime, reverse=True)
        return versions[0]

    async def _scan_plugin_agents(self) -> List[Dict[str, Any]]:
        """
        扫描启用的插件中的子代理

        只扫描 marketplaces 目录中的插件，完全跳过 cache 目录

        Returns:
            List[Dict]: 插件子代理列表
        """
        agents = []

        try:
            if not self.plugins_dir.exists():
                return agents

            # 步骤 1: 获取启用的插件列表
            enabled_plugins = self._get_enabled_plugins()
            logger.info(f"Enabled plugins: {list(enabled_plugins.keys())}")

            # 步骤 2: 只扫描 marketplaces 目录，完全跳过 cache
            agents_dirs_to_scan = []

            for plugin_name, marketplace in enabled_plugins.items():
                # 只扫描 marketplaces 目录（稳定版本）
                marketplace_agents_dir = self.plugins_dir / "marketplaces" / marketplace / "plugins" / plugin_name / "agents"
                if marketplace_agents_dir.exists() and marketplace_agents_dir.is_dir():
                    agents_dirs_to_scan.append((marketplace_agents_dir, plugin_name, marketplace))
                # 注意：完全跳过 cache 目录，不再作为备选

            # 步骤 3: 扫描每个目录
            for agents_dir, plugin_name, marketplace in agents_dirs_to_scan:
                # 跳过空目录
                if not any(agents_dir.iterdir()):
                    continue

                plugin_agents = await self._scan_agents_in_dir(
                    agents_dir,
                    scope="plugin",
                    priority=4
                )

                # 在 meta 中记录插件信息
                for agent in plugin_agents:
                    agent["meta"]["plugin_name"] = plugin_name
                    agent["meta"]["plugin_namespace"] = marketplace
                    agents.append(agent)

            logger.info(f"Scanned {len(agents_dirs_to_scan)} enabled plugin agents directories")

        except Exception as e:
            logger.error(f"Error scanning plugin agents: {e}")

        return agents

    def _extract_plugin_info_for_agents(self, agents_dir: Path) -> Dict[str, str]:
        """
        从 agents 目录路径中提取插件信息

        复用 skills 的提取逻辑
        """
        return self._extract_plugin_info(agents_dir)

    def _mark_agent_overrides(self, agents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        标记被覆盖的子代理

        当多个子代理同名时，高优先级（priority 数值小）的覆盖低优先级的

        Args:
            agents: 子代理列表

        Returns:
            List[Dict]: 添加了覆盖标记的子代理列表
        """
        from collections import defaultdict

        # 按名称分组
        name_to_agents = defaultdict(list)
        for idx, agent in enumerate(agents):
            name_to_agents[agent["name"]].append({
                "index": idx,
                "priority": agent.get("priority", 999),
                "scope": agent.get("scope", "unknown")
            })

        # 标记每个 agent
        for agent in agents:
            name = agent["name"]
            same_name_agents = name_to_agents[name]

            if len(same_name_agents) > 1:
                # 找到最高优先级（priority 最小）
                min_priority = min(a["priority"] for a in same_name_agents)
                agent_priority = agent.get("priority", 999)

                if agent_priority == min_priority:
                    # 这个是激活的
                    agent["is_active"] = True
                    agent["is_overridden"] = False
                else:
                    # 这个被覆盖了
                    agent["is_active"] = False
                    agent["is_overridden"] = True

                # 记录所有同名 agent 的位置
                agent["override_info"] = {
                    "count": len(same_name_agents),
                    "scopes": [a["scope"] for a in same_name_agents],
                    "active_scope": next(
                        (a["scope"] for a in same_name_agents if a["priority"] == min_priority),
                        "unknown"
                    )
                }
            else:
                agent["is_active"] = True
                agent["is_overridden"] = False
                agent["override_info"] = None

        return agents

    async def scan_agent_teams(self) -> List[Dict[str, Any]]:
        """
        扫描所有智能体队伍

        Returns:
            List[Dict]: 队伍列表
        """
        teams = []

        # 扫描 ~/.claude/teams/
        teams_dir = self.config_dir / "teams"
        if teams_dir.exists():
            try:
                for team_file in teams_dir.glob("*.json"):
                    team_data = await self._parse_agent_team(team_file)
                    if team_data:
                        teams.append(team_data)
            except Exception as e:
                logger.error(f"Error scanning agent teams: {e}")

        logger.info(f"Found {len(teams)} agent teams")
        return teams

    async def _parse_agent_team(self, team_file: Path) -> Optional[Dict[str, Any]]:
        """
        解析队伍配置文件

        Args:
            team_file: 队伍配置文件路径

        Returns:
            Dict: 队伍数据
        """
        try:
            with open(team_file, "r", encoding="utf-8") as f:
                config = json.load(f)

            return {
                "name": config.get("name", team_file.stem),
                "description": config.get("description", ""),
                "members": config.get("members", []),
                "tags": config.get("tags", []),
                "meta": {
                    "path": str(team_file),
                    **config.get("meta", {})
                }
            }

        except Exception as e:
            logger.error(f"Error parsing agent team {team_file}: {e}")
            return None

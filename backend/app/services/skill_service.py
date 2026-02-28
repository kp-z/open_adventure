"""
Skill Service
"""
import os
import shutil
from pathlib import Path
from typing import Optional

from app.repositories.skill_repository import SkillRepository
from app.schemas.skill import SkillCreate, SkillUpdate, SkillResponse, SkillListResponse
from app.models.skill import SkillSource
from app.core.exceptions import NotFoundException, ConflictException
from app.adapters.claude import ClaudeAdapter


class SkillService:
    """Service for skill business logic"""

    def __init__(self, repository: SkillRepository):
        self.repository = repository
        self.claude_adapter = ClaudeAdapter()

    def _get_skill_directory(self, skill_name: str, source: SkillSource = SkillSource.PROJECT, meta: Optional[dict] = None) -> Path:
        """Get the directory path for a skill based on its source"""
        if source == SkillSource.GLOBAL:
            base_path = Path(self.claude_adapter.config_dir) / "skills"
        elif source == SkillSource.PROJECT:
            # 如果 meta 中有 project_path，使用它；否则使用当前目录
            if meta and meta.get("project_path"):
                base_path = Path(meta["project_path"]) / ".claude" / "skills"
            else:
                base_path = Path.cwd() / ".claude" / "skills"
        elif source == SkillSource.PLUGIN:
            # Plugin skills 保存在 ~/.claude/plugins/{plugin_name}/skills/
            if not meta or not meta.get("plugin_name"):
                raise ValueError("Plugin skills 需要在 meta 中指定 plugin_name")
            plugin_name = meta["plugin_name"]
            base_path = Path.home() / ".claude" / "plugins" / plugin_name / "skills"
        else:
            raise ValueError(f"Unknown skill source: {source}")

        return base_path / skill_name

    def _create_skill_files(self, skill_dir: Path, skill_data: SkillCreate) -> None:
        """Create skill files on filesystem"""
        # Create skill directory
        skill_dir.mkdir(parents=True, exist_ok=True)

        # Create SKILL.md
        skill_md_content = f"""# {skill_data.name}

{skill_data.description}

## Usage
[Add usage instructions here]

## Examples
[Add examples here]
"""
        (skill_dir / "SKILL.md").write_text(skill_md_content, encoding="utf-8")

        # Create references directory if needed
        if hasattr(skill_data, 'references') and skill_data.references:
            refs_dir = skill_dir / "references"
            refs_dir.mkdir(exist_ok=True)
            for ref_name, ref_content in skill_data.references.items():
                (refs_dir / ref_name).write_text(ref_content, encoding="utf-8")

        # Create scripts directory if needed
        if hasattr(skill_data, 'scripts') and skill_data.scripts:
            scripts_dir = skill_dir / "scripts"
            scripts_dir.mkdir(exist_ok=True)
            for script_name, script_content in skill_data.scripts.items():
                script_path = scripts_dir / script_name
                script_path.write_text(script_content, encoding="utf-8")
                # Make scripts executable
                script_path.chmod(0o755)

    def _update_skill_files(self, skill_dir: Path, skill_data: SkillUpdate) -> None:
        """Update skill files on filesystem"""
        if not skill_dir.exists():
            raise NotFoundException(f"Skill directory not found: {skill_dir}")

        # Update SKILL.md if description changed
        if skill_data.description:
            skill_md_path = skill_dir / "SKILL.md"
            if skill_md_path.exists():
                content = skill_md_path.read_text(encoding="utf-8")
                # Simple update - replace first paragraph after title
                lines = content.split('\n')
                if len(lines) > 2:
                    lines[2] = skill_data.description
                    skill_md_path.write_text('\n'.join(lines), encoding="utf-8")

    def _delete_skill_files(self, skill_dir: Path) -> None:
        """Delete skill files from filesystem"""
        if skill_dir.exists():
            shutil.rmtree(skill_dir)

    async def create_skill(self, skill_data: SkillCreate) -> SkillResponse:
        """Create a new skill"""
        # Check if skill with same name already exists
        existing = await self.repository.get_by_name(skill_data.name)
        if existing:
            raise ConflictException(f"Skill with name '{skill_data.name}' already exists")

        # 验证 scope 相关的 meta 数据
        if hasattr(skill_data, 'scope'):
            if skill_data.scope == "plugin":
                if not skill_data.meta or not skill_data.meta.get("plugin_name"):
                    raise ConflictException("Plugin scope 需要在 meta 中指定 plugin_name")
                # 验证 plugin 是否存在
                plugin_dir = Path.home() / ".claude" / "plugins" / skill_data.meta["plugin_name"]
                if not plugin_dir.exists():
                    raise NotFoundException(f"Plugin '{skill_data.meta['plugin_name']}' 不存在")
            elif skill_data.scope == "project":
                if not skill_data.meta or not skill_data.meta.get("project_path"):
                    raise ConflictException("Project scope 需要在 meta 中指定 project_path")

        # Create skill in database
        skill = await self.repository.create(skill_data)

        # Sync to filesystem
        try:
            skill_dir = self._get_skill_directory(skill_data.name, skill_data.source, skill_data.meta)
            self._create_skill_files(skill_dir, skill_data)

            # 更新 meta 中的路径
            if skill.meta is None:
                skill.meta = {}
            skill.meta["path"] = str(skill_dir)
            await self.repository.update(skill.id, SkillUpdate(meta=skill.meta))

        except Exception as e:
            # If filesystem sync fails, rollback database creation
            await self.repository.delete(skill.id)
            raise Exception(f"Failed to create skill files: {str(e)}")

        return SkillResponse.model_validate(skill)

    async def get_skill(self, skill_id: int) -> SkillResponse:
        """Get skill by ID"""
        skill = await self.repository.get_by_id(skill_id)
        if not skill:
            raise NotFoundException(f"Skill with id {skill_id} not found")
        return SkillResponse.model_validate(skill)

    async def get_skill_by_name(self, name: str) -> SkillResponse:
        """Get skill by name"""
        skill = await self.repository.get_by_name(name)
        if not skill:
            raise NotFoundException(f"Skill with name '{name}' not found")
        return SkillResponse.model_validate(skill)

    async def list_skills(
        self,
        skip: int = 0,
        limit: int = 100,
        source: Optional[SkillSource] = None,
        enabled: Optional[bool] = None
    ) -> SkillListResponse:
        """List all skills with pagination and filters"""
        skills, total = await self.repository.get_all(
            skip=skip,
            limit=limit,
            source=source,
            enabled=enabled
        )
        return SkillListResponse(
            total=total,
            items=[SkillResponse.model_validate(skill) for skill in skills]
        )

    async def update_skill(self, skill_id: int, skill_data: SkillUpdate) -> SkillResponse:
        """Update a skill"""
        # Get existing skill
        existing_skill = await self.repository.get_by_id(skill_id)
        if not existing_skill:
            raise NotFoundException(f"Skill with id {skill_id} not found")

        # If name is being updated, check for conflicts
        if skill_data.name:
            name_conflict = await self.repository.get_by_name(skill_data.name)
            if name_conflict and name_conflict.id != skill_id:
                raise ConflictException(f"Skill with name '{skill_data.name}' already exists")

        # 检查是否修改了 scope
        scope_changed = False
        new_skill_dir = None

        if skill_data.scope and skill_data.scope != existing_skill.source:
            scope_changed = True
            old_skill_dir = self._get_skill_directory(existing_skill.name, existing_skill.source, existing_skill.meta)

            # 验证新 scope 的 meta 数据
            if skill_data.scope == "plugin":
                if not skill_data.meta or not skill_data.meta.get("plugin_name"):
                    raise ConflictException("Plugin scope 需要在 meta 中指定 plugin_name")
                plugin_dir = Path.home() / ".claude" / "plugins" / skill_data.meta["plugin_name"]
                if not plugin_dir.exists():
                    raise NotFoundException(f"Plugin '{skill_data.meta['plugin_name']}' 不存在")
            elif skill_data.scope == "project":
                if not skill_data.meta or not skill_data.meta.get("project_path"):
                    raise ConflictException("Project scope 需要在 meta 中指定 project_path")

            # 确定新路径
            # 将 scope 字符串映射到 SkillSource 枚举
            from app.models.skill import SkillSource
            scope_map = {
                "user": SkillSource.GLOBAL,
                "project": SkillSource.PROJECT,
                "plugin": SkillSource.PLUGIN
            }
            new_source = scope_map.get(skill_data.scope, existing_skill.source)
            new_skill_dir = self._get_skill_directory(existing_skill.name, new_source, skill_data.meta)

            # 移动目录
            if old_skill_dir.exists():
                new_skill_dir.parent.mkdir(parents=True, exist_ok=True)
                shutil.move(str(old_skill_dir), str(new_skill_dir))
                print(f"[SkillService] Moved skill from {old_skill_dir} to {new_skill_dir}")

                # 更新 meta 中的路径
                if not skill_data.meta:
                    skill_data.meta = existing_skill.meta or {}
                skill_data.meta["path"] = str(new_skill_dir)

        # Update in database
        skill = await self.repository.update(skill_id, skill_data)
        if not skill:
            raise NotFoundException(f"Skill with id {skill_id} not found")

        # Sync to filesystem
        try:
            if scope_changed:
                skill_dir = new_skill_dir
            else:
                old_skill_dir = self._get_skill_directory(existing_skill.name, existing_skill.source, existing_skill.meta)

                # If name changed, rename directory
                if skill_data.name and skill_data.name != existing_skill.name:
                    new_skill_dir = self._get_skill_directory(skill_data.name, existing_skill.source, existing_skill.meta)
                    if old_skill_dir.exists():
                        old_skill_dir.rename(new_skill_dir)
                        old_skill_dir = new_skill_dir

                skill_dir = old_skill_dir

            # Update skill files
            self._update_skill_files(skill_dir, skill_data)
        except Exception as e:
            # Log error but don't fail the update
            print(f"Warning: Failed to update skill files: {str(e)}")

        return SkillResponse.model_validate(skill)

    async def delete_skill(self, skill_id: int) -> None:
        """Delete a skill and its files from filesystem"""
        # 步骤 1: 获取要删除的 skill
        skill = await self.repository.get_by_id(skill_id)
        if not skill:
            raise NotFoundException(f"Skill with id {skill_id} not found")

        # 步骤 2: 从数据库删除
        success = await self.repository.delete(skill_id)
        if not success:
            raise NotFoundException(f"Skill with id {skill_id} not found")

        # 步骤 3: 从文件系统删除
        try:
            skill_dir = self._get_skill_directory_for_delete(skill)
            if skill_dir and skill_dir.exists():
                print(f"[SkillService] Deleting skill files at: {skill_dir}")
                self._delete_skill_files(skill_dir)
                print(f"[SkillService] Successfully deleted skill files")
            else:
                print(f"[SkillService] Skill directory not found: {skill_dir}")
        except Exception as e:
            # 记录错误但不影响删除操作
            print(f"Warning: Failed to delete skill files: {str(e)}")
    
    def _get_skill_directory_for_delete(self, skill) -> Optional[Path]:
        """
        获取 skill 目录路径用于删除
        支持所有类型的 skills：global、project、plugin
        """
        # 优先从 meta.path 获取（plugin skills 存储在这里）
        if skill.meta and isinstance(skill.meta, dict) and 'path' in skill.meta:
            return Path(skill.meta['path'])
        
        # 根据 source 类型确定目录
        if skill.source == SkillSource.GLOBAL:
            return Path(self.claude_adapter.config_dir) / "skills" / skill.name
        elif skill.source == SkillSource.PROJECT:
            return Path.cwd() / ".claude" / "skills" / skill.name
        elif skill.source == SkillSource.PLUGIN:
            # Plugin skills 如果没有 meta.path，尝试常见路径
            plugin_base = Path(self.claude_adapter.config_dir) / "plugins"
            possible_paths = [
                plugin_base / "claude-manager" / "skills" / skill.name,
                Path.home() / ".claude" / "skills" / skill.name,
            ]
            for path in possible_paths:
                if path.exists():
                    return path
            print(f"[SkillService] Could not find plugin skill directory for: {skill.name}")
            return None
        
        return None

    async def search_skills(
        self,
        query: str,
        skip: int = 0,
        limit: int = 100
    ) -> SkillListResponse:
        """Search skills by name or description"""
        skills, total = await self.repository.search(query, skip=skip, limit=limit)
        return SkillListResponse(
            total=total,
            items=[SkillResponse.model_validate(skill) for skill in skills]
        )

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

    def _get_skill_directory(self, skill_name: str, source: SkillSource = SkillSource.PROJECT) -> Path:
        """Get the directory path for a skill based on its source"""
        if source == SkillSource.GLOBAL:
            base_path = Path(self.claude_adapter.config_dir) / "skills"
        elif source == SkillSource.PROJECT:
            # Use current project's .claude/skills directory
            base_path = Path.cwd() / ".claude" / "skills"
        else:
            # Plugin skills are read-only, shouldn't be modified
            raise ValueError(f"Cannot modify plugin skills")

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

        # Create skill in database
        skill = await self.repository.create(skill_data)

        # Sync to filesystem
        try:
            skill_dir = self._get_skill_directory(skill_data.name, skill_data.source)
            self._create_skill_files(skill_dir, skill_data)
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

        # Update in database
        skill = await self.repository.update(skill_id, skill_data)
        if not skill:
            raise NotFoundException(f"Skill with id {skill_id} not found")

        # Sync to filesystem
        try:
            old_skill_dir = self._get_skill_directory(existing_skill.name, existing_skill.source)

            # If name changed, rename directory
            if skill_data.name and skill_data.name != existing_skill.name:
                new_skill_dir = self._get_skill_directory(skill_data.name, existing_skill.source)
                if old_skill_dir.exists():
                    old_skill_dir.rename(new_skill_dir)
                    old_skill_dir = new_skill_dir

            # Update skill files
            self._update_skill_files(old_skill_dir, skill_data)
        except Exception as e:
            # Log error but don't fail the update
            print(f"Warning: Failed to update skill files: {str(e)}")

        return SkillResponse.model_validate(skill)

    async def delete_skill(self, skill_id: int) -> None:
        """Delete a skill"""
        # Get skill before deletion
        skill = await self.repository.get_by_id(skill_id)
        if not skill:
            raise NotFoundException(f"Skill with id {skill_id} not found")

        # Delete from database
        success = await self.repository.delete(skill_id)
        if not success:
            raise NotFoundException(f"Skill with id {skill_id} not found")

        # Delete from filesystem
        try:
            skill_dir = self._get_skill_directory(skill.name, skill.source)
            self._delete_skill_files(skill_dir)
        except Exception as e:
            # Log error but don't fail the deletion
            print(f"Warning: Failed to delete skill files: {str(e)}")

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

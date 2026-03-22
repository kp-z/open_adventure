"""
Plugin Service
"""
import asyncio
import shutil
from pathlib import Path
from typing import Optional
from datetime import datetime

from app.repositories.plugin_repository import PluginRepository
from app.schemas.plugin import PluginCreate, PluginUpdate, PluginResponse, PluginListResponse
from app.models.plugin import PluginStatus
from app.core.exceptions import NotFoundException, ConflictException
from app.adapters.git import GitAdapter


class PluginService:
    """Service for plugin business logic"""

    def __init__(self, repository: PluginRepository):
        self.repository = repository
        self.git_adapter = GitAdapter()
        self.marketplace_dir = Path.home() / ".claude" / "plugins" / "marketplace-plugins"
        # 项目根目录是 backend 的父目录
        from app.core.path_resolver import get_marketplace_dir
        self.project_marketplace_dir = get_marketplace_dir()

    async def list_plugins(
        self,
        skip: int = 0,
        limit: int = 100,
        status: Optional[PluginStatus] = None,
        enabled: Optional[bool] = None
    ) -> PluginListResponse:
        """List all plugins with pagination and filters"""
        plugins, total = await self.repository.get_all(
            skip=skip,
            limit=limit,
            status=status,
            enabled=enabled
        )
        return PluginListResponse(
            total=total,
            items=[PluginResponse.model_validate(plugin) for plugin in plugins]
        )

    async def get_plugin(self, plugin_id: int) -> PluginResponse:
        """Get plugin by ID"""
        plugin = await self.repository.get_by_id(plugin_id)
        if not plugin:
            raise NotFoundException(f"Plugin with id {plugin_id} not found")
        return PluginResponse.model_validate(plugin)

    async def create_plugin(self, plugin_data: PluginCreate) -> PluginResponse:
        """Create a new plugin (database record only)"""
        # Check if plugin with same name already exists
        existing = await self.repository.get_by_name(plugin_data.name)
        if existing:
            raise ConflictException(f"Plugin with name '{plugin_data.name}' already exists")

        # Create plugin in database
        plugin = await self.repository.create(plugin_data)
        return PluginResponse.model_validate(plugin)

    async def update_plugin(self, plugin_id: int, plugin_data: PluginUpdate) -> PluginResponse:
        """Update a plugin"""
        plugin = await self.repository.update(plugin_id, plugin_data)
        if not plugin:
            raise NotFoundException(f"Plugin with id {plugin_id} not found")
        return PluginResponse.model_validate(plugin)

    async def delete_plugin(self, plugin_id: int, remove_files: bool = False) -> bool:
        """Delete a plugin"""
        plugin = await self.repository.get_by_id(plugin_id)
        if not plugin:
            raise NotFoundException(f"Plugin with id {plugin_id} not found")

        # Remove files if requested
        if remove_files and plugin.local_path:
            plugin_path = Path(plugin.local_path)
            if plugin_path.exists():
                await asyncio.to_thread(shutil.rmtree, plugin_path)

        # Delete from database
        return await self.repository.delete(plugin_id)

    async def check_update(self, plugin_id: int) -> PluginResponse:
        """Check for updates for a single plugin"""
        plugin = await self.repository.get_by_id(plugin_id)
        if not plugin:
            raise NotFoundException(f"Plugin with id {plugin_id} not found")

        if not plugin.local_path:
            raise ConflictException(f"Plugin {plugin.name} is not installed")

        plugin_path = Path(plugin.local_path)
        if not plugin_path.exists():
            raise ConflictException(f"Plugin directory not found: {plugin_path}")

        # Get local and remote commit hashes
        local_hash = await asyncio.to_thread(
            self.git_adapter.get_local_commit_hash, plugin_path
        )
        remote_hash = await asyncio.to_thread(
            self.git_adapter.get_remote_commit_hash, plugin_path, plugin.branch
        )

        # Update plugin status
        update_data = PluginUpdate(
            local_commit_hash=local_hash,
            remote_commit_hash=remote_hash,
            last_check_time=datetime.utcnow()
        )

        if local_hash and remote_hash and local_hash != remote_hash:
            update_data.status = PluginStatus.UPDATE_AVAILABLE
        elif local_hash and remote_hash and local_hash == remote_hash:
            update_data.status = PluginStatus.INSTALLED

        plugin = await self.repository.update(plugin_id, update_data)
        return PluginResponse.model_validate(plugin)

    async def check_all_updates(self) -> PluginListResponse:
        """Check for updates for all plugins"""
        plugins, total = await self.repository.get_all(limit=1000)

        updated_plugins = []
        for plugin in plugins:
            try:
                updated_plugin = await self.check_update(plugin.id)
                updated_plugins.append(updated_plugin)
            except Exception as e:
                print(f"[PluginService] Error checking update for plugin {plugin.name}: {e}")
                updated_plugins.append(PluginResponse.model_validate(plugin))

        return PluginListResponse(
            total=len(updated_plugins),
            items=updated_plugins
        )

    async def install_plugin(self, plugin_id: int) -> PluginResponse:
        """Install a plugin (git clone)"""
        plugin = await self.repository.get_by_id(plugin_id)
        if not plugin:
            raise NotFoundException(f"Plugin with id {plugin_id} not found")

        if plugin.local_path and Path(plugin.local_path).exists():
            raise ConflictException(f"Plugin {plugin.name} is already installed")

        # Update status to installing
        await self.repository.update(plugin_id, PluginUpdate(status=PluginStatus.INSTALLING))

        try:
            # Create plugin directory
            plugin_path = self.marketplace_dir / plugin.name
            plugin_path.parent.mkdir(parents=True, exist_ok=True)

            # Clone repository
            success = await asyncio.to_thread(
                self.git_adapter.clone,
                plugin.git_repo_url,
                plugin_path,
                plugin.branch
            )

            if not success:
                raise Exception("Git clone failed")

            # Get commit hash
            local_hash = await asyncio.to_thread(
                self.git_adapter.get_local_commit_hash, plugin_path
            )

            # Update plugin
            update_data = PluginUpdate(
                local_path=str(plugin_path),
                local_commit_hash=local_hash,
                remote_commit_hash=local_hash,
                status=PluginStatus.INSTALLED
            )
            plugin = await self.repository.update(plugin_id, update_data)

        except Exception as e:
            # Update status to error
            await self.repository.update(plugin_id, PluginUpdate(status=PluginStatus.ERROR))
            raise Exception(f"Failed to install plugin: {str(e)}")

        return PluginResponse.model_validate(plugin)

    async def update_plugin_files(self, plugin_id: int) -> PluginResponse:
        """Update plugin files (git pull)"""
        plugin = await self.repository.get_by_id(plugin_id)
        if not plugin:
            raise NotFoundException(f"Plugin with id {plugin_id} not found")

        if not plugin.local_path:
            raise ConflictException(f"Plugin {plugin.name} is not installed")

        plugin_path = Path(plugin.local_path)
        if not plugin_path.exists():
            raise ConflictException(f"Plugin directory not found: {plugin_path}")

        # Update status to updating
        await self.repository.update(plugin_id, PluginUpdate(status=PluginStatus.UPDATING))

        try:
            # Pull updates
            success = await asyncio.to_thread(self.git_adapter.pull, plugin_path)

            if not success:
                raise Exception("Git pull failed")

            # Get new commit hash
            local_hash = await asyncio.to_thread(
                self.git_adapter.get_local_commit_hash, plugin_path
            )

            # Update plugin
            update_data = PluginUpdate(
                local_commit_hash=local_hash,
                remote_commit_hash=local_hash,
                status=PluginStatus.INSTALLED
            )
            plugin = await self.repository.update(plugin_id, update_data)

        except Exception as e:
            # Update status to error
            await self.repository.update(plugin_id, PluginUpdate(status=PluginStatus.ERROR))
            raise Exception(f"Failed to update plugin: {str(e)}")

        return PluginResponse.model_validate(plugin)

    async def scan_marketplace(self) -> PluginListResponse:
        """
        Scan marketplace directories and sync to database

        Scans two locations:
        1. Project marketplace directory (marketplace/)
        2. User marketplace directory (~/.claude/plugins/marketplace-plugins/)
        """
        synced_plugins = []

        # Collect all directories to scan
        dirs_to_scan = []

        # Add project marketplace directory if exists
        if self.project_marketplace_dir.exists():
            dirs_to_scan.append(("project", self.project_marketplace_dir))

        # Add user marketplace directory if exists
        if self.marketplace_dir.exists():
            dirs_to_scan.append(("user", self.marketplace_dir))

        if not dirs_to_scan:
            return PluginListResponse(total=0, items=[])

        # Scan all marketplace directories
        for source_type, marketplace_dir in dirs_to_scan:
            # For project marketplace, scan recursively to find all plugin directories
            # For user marketplace, scan only direct subdirectories
            if source_type == "project":
                # Recursively find all directories that could be plugins
                # Look for directories that contain skills/ or agents/ subdirectories
                for root_dir in marketplace_dir.rglob("*"):
                    if not root_dir.is_dir():
                        continue

                    # Check if this directory contains skills/ or agents/ subdirectories
                    has_skills = (root_dir / "skills").exists()
                    has_agents = (root_dir / "agents").exists()

                    if not (has_skills or has_agents):
                        continue

                    plugin_dir = root_dir
                    plugin_name = plugin_dir.name

                    # Process this plugin directory
                    await self._process_plugin_directory(plugin_dir, plugin_name, source_type, synced_plugins)
            else:
                # User marketplace: scan only direct subdirectories
                for plugin_dir in marketplace_dir.iterdir():
                    if not plugin_dir.is_dir():
                        continue

                    plugin_name = plugin_dir.name

                    # Process this plugin directory
                    await self._process_plugin_directory(plugin_dir, plugin_name, source_type, synced_plugins)

        return PluginListResponse(
            total=len(synced_plugins),
            items=synced_plugins
        )

    async def _process_plugin_directory(
        self,
        plugin_dir: Path,
        plugin_name: str,
        source_type: str,
        synced_plugins: list
    ) -> None:
        """Process a single plugin directory and add to synced_plugins list"""
        # Check if this is a Git repository
        git_dir = plugin_dir / ".git"
        is_git_repo = git_dir.exists()

        # Check if plugin already exists in database
        existing = await self.repository.get_by_name(plugin_name)

        if existing:
            # Update local_path if needed
            if existing.local_path != str(plugin_dir):
                await self.repository.update(
                    existing.id,
                    PluginUpdate(local_path=str(plugin_dir))
                )
            synced_plugins.append(PluginResponse.model_validate(existing))
        else:
            # Create new plugin record
            if is_git_repo:
                # Git repository: get commit hash
                local_hash = await asyncio.to_thread(
                    self.git_adapter.get_local_commit_hash, plugin_dir
                )

                plugin_data = PluginCreate(
                    name=plugin_name,
                    display_name=plugin_name,
                    description=f"{source_type.capitalize()} marketplace: {plugin_name}",
                    git_repo_url="https://github.com/unknown/unknown",  # Placeholder, user can update later
                    branch="main",
                    local_path=str(plugin_dir),
                    local_commit_hash=local_hash
                )
            else:
                # Local directory without Git: no commit hash
                plugin_data = PluginCreate(
                    name=plugin_name,
                    display_name=plugin_name,
                    description=f"{source_type.capitalize()} plugin: {plugin_name}",
                    git_repo_url="N/A",  # Not a Git repository
                    branch="N/A",
                    local_path=str(plugin_dir),
                    local_commit_hash=None
                )

            plugin = await self.repository.create(plugin_data)
            synced_plugins.append(PluginResponse.model_validate(plugin))

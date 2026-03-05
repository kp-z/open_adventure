"""
Marketplace Config Service
管理 Marketplace Plugins 配置
"""
import json
import uuid
import asyncio
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime

from app.adapters.git import GitAdapter
from app.core.logging import get_logger

logger = get_logger(__name__)


class MarketplaceConfigService:
    """Marketplace 配置管理服务"""

    def __init__(self):
        """初始化服务"""
        self.config_file = Path.home() / ".claude" / "marketplace_repos.json"
        self.marketplace_dir = Path.home() / ".claude" / "plugins" / "marketplace-plugins"
        self.git_adapter = GitAdapter()

        # 确保目录存在
        self.config_file.parent.mkdir(parents=True, exist_ok=True)
        self.marketplace_dir.mkdir(parents=True, exist_ok=True)

        # 确保配置文件存在
        if not self.config_file.exists():
            self._save_config([])

    def _load_config(self) -> List[Dict[str, Any]]:
        """加载配置文件"""
        try:
            with open(self.config_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"加载配置文件失败: {e}")
            return []

    def _save_config(self, repos: List[Dict[str, Any]]) -> None:
        """保存配置文件"""
        try:
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(repos, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"保存配置文件失败: {e}")
            raise

    def get_all_repos(self) -> List[Dict[str, Any]]:
        """获取所有 repository 配置"""
        return self._load_config()

    def add_repo(
        self,
        git_repo_url: str,
        branch: str = "main",
        auto_update: bool = False
    ) -> Dict[str, Any]:
        """
        添加 repository 配置

        Args:
            git_repo_url: Git repository URL
            branch: 分支名称
            auto_update: 是否自动更新

        Returns:
            添加的配置

        Raises:
            ValueError: 如果 URL 已存在
        """
        repos = self._load_config()

        # 检查是否已存在
        for repo in repos:
            if repo['git_repo_url'] == git_repo_url:
                raise ValueError(f"Repository 已存在: {git_repo_url}")

        # 创建新配置
        new_repo = {
            'id': str(uuid.uuid4()),
            'git_repo_url': git_repo_url,
            'branch': branch,
            'auto_update': auto_update,
            'last_sync_time': None
        }

        repos.append(new_repo)
        self._save_config(repos)

        logger.info(f"添加 Marketplace 配置: {git_repo_url}")
        return new_repo

    def delete_repo(self, repo_id: str) -> bool:
        """
        删除 repository 配置

        Args:
            repo_id: Repository ID

        Returns:
            是否删除成功
        """
        repos = self._load_config()
        original_count = len(repos)

        repos = [repo for repo in repos if repo['id'] != repo_id]

        if len(repos) == original_count:
            return False

        self._save_config(repos)
        logger.info(f"删除 Marketplace 配置: {repo_id}")
        return True

    async def sync_repo(self, repo_id: str) -> Dict[str, Any]:
        """
        同步 repository（拉取并安装）

        Args:
            repo_id: Repository ID

        Returns:
            同步结果

        Raises:
            ValueError: 如果 repository 不存在
        """
        repos = self._load_config()

        # 查找 repository
        repo = None
        repo_index = -1
        for i, r in enumerate(repos):
            if r['id'] == repo_id:
                repo = r
                repo_index = i
                break

        if not repo:
            raise ValueError(f"Repository 不存在: {repo_id}")

        # 提取 repository 名称（从 URL 中）
        repo_name = self._extract_repo_name(repo['git_repo_url'])
        repo_path = self.marketplace_dir / repo_name

        try:
            # 如果目录已存在，执行 pull；否则执行 clone
            if repo_path.exists():
                logger.info(f"更新 repository: {repo_name}")
                success = await asyncio.to_thread(self.git_adapter.pull, repo_path)
                if not success:
                    raise Exception("Git pull 失败")
            else:
                logger.info(f"克隆 repository: {repo_name}")
                success = await asyncio.to_thread(
                    self.git_adapter.clone,
                    repo['git_repo_url'],
                    repo_path,
                    repo['branch']
                )
                if not success:
                    raise Exception("Git clone 失败")

            # 更新 last_sync_time
            repos[repo_index]['last_sync_time'] = datetime.utcnow().isoformat()
            self._save_config(repos)

            logger.info(f"同步 Marketplace 配置成功: {repo_name}")
            return {
                'repo_id': repo_id,
                'repo_name': repo_name,
                'local_path': str(repo_path),
                'last_sync_time': repos[repo_index]['last_sync_time']
            }

        except Exception as e:
            logger.error(f"同步 Marketplace 配置失败: {e}")
            raise

    def _extract_repo_name(self, git_repo_url: str) -> str:
        """
        从 Git URL 中提取 repository 名称

        Args:
            git_repo_url: Git repository URL

        Returns:
            Repository 名称
        """
        # 移除 .git 后缀
        url = git_repo_url.rstrip('/')
        if url.endswith('.git'):
            url = url[:-4]

        # 提取最后一部分作为名称
        parts = url.split('/')
        return parts[-1] if parts else 'unknown'

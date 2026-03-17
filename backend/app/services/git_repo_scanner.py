"""Git 仓库扫描服务"""
import os
import asyncio
from pathlib import Path
from typing import List, Set
import logging

logger = logging.getLogger(__name__)


class GitRepoScanner:
    """扫描文件系统中的 Git 仓库"""

    def __init__(self):
        self.exclude_patterns = {
            "node_modules",
            ".venv",
            "venv",
            "env",
            "__pycache__",
            ".cache",
            "Library",  # macOS
            "AppData",  # Windows
            ".Trash",
            "Trash",
            ".npm",
            ".cargo",
            ".rustup",
            "go/pkg",
        }

    def _is_git_repo(self, path: Path) -> bool:
        """检查目录是否为 Git 仓库"""
        try:
            git_dir = path / ".git"
            return git_dir.exists() and git_dir.is_dir()
        except (PermissionError, OSError):
            return False

    def _should_exclude(self, path: Path) -> bool:
        """检查是否应该排除该目录"""
        try:
            # 检查目录名是否在排除列表中
            if path.name in self.exclude_patterns:
                return True

            # 检查是否为隐藏目录（除了 .git）
            if path.name.startswith(".") and path.name != ".git":
                return True

            # 检查是否有读取权限
            if not os.access(path, os.R_OK):
                return True

            return False
        except (PermissionError, OSError):
            return True

    def _scan_directory(
        self, base_path: Path, current_depth: int, max_depth: int, found_repos: Set[str]
    ) -> None:
        """递归扫描目录"""
        # 检查深度限制
        if current_depth > max_depth:
            return

        # 检查是否应该排除
        if self._should_exclude(base_path):
            return

        try:
            # 检查是否为 Git 仓库
            if self._is_git_repo(base_path):
                found_repos.add(str(base_path.resolve()))
                # 找到 Git 仓库后不再深入扫描
                return

            # 扫描子目录
            try:
                for entry in base_path.iterdir():
                    if entry.is_dir() and not entry.is_symlink():
                        self._scan_directory(entry, current_depth + 1, max_depth, found_repos)
            except (PermissionError, OSError) as e:
                logger.debug(f"无法访问目录 {base_path}: {e}")

        except Exception as e:
            logger.warning(f"扫描目录 {base_path} 时出错: {e}")

    def scan_directories(
        self, base_dirs: List[str], max_depth: int = 3, max_repos: int = 100
    ) -> List[str]:
        """
        扫描指定目录，查找所有 Git 仓库

        Args:
            base_dirs: 要扫描的基础目录列表
            max_depth: 最大扫描深度（默认 3 层）
            max_repos: 最多返回的仓库数量（默认 100）

        Returns:
            Git 仓库路径列表
        """
        found_repos: Set[str] = set()

        for base_dir in base_dirs:
            try:
                # 展开用户主目录
                base_path = Path(base_dir).expanduser().resolve()

                # 检查目录是否存在
                if not base_path.exists() or not base_path.is_dir():
                    logger.warning(f"目录不存在或不是目录: {base_dir}")
                    continue

                # 检查是否有读取权限
                if not os.access(base_path, os.R_OK):
                    logger.warning(f"没有读取权限: {base_dir}")
                    continue

                logger.info(f"开始扫描目录: {base_path} (最大深度: {max_depth})")
                self._scan_directory(base_path, 0, max_depth, found_repos)

                # 检查是否达到最大数量
                if len(found_repos) >= max_repos:
                    logger.warning(f"已达到最大仓库数量限制: {max_repos}")
                    break

            except Exception as e:
                logger.error(f"扫描基础目录 {base_dir} 时出错: {e}")

        result = sorted(list(found_repos))
        logger.info(f"扫描完成，共发现 {len(result)} 个 Git 仓库")
        return result

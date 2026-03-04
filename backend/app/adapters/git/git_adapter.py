"""
Git Adapter - Git 操作适配器
"""
import subprocess
from pathlib import Path
from typing import Optional


class GitAdapter:
    """Git 操作适配器"""

    def __init__(self):
        self.timeout = 30

    def _run_command(self, cmd: list[str], cwd: Optional[Path] = None) -> tuple[bool, str, str]:
        """执行 Git 命令"""
        try:
            result = subprocess.run(
                cmd, cwd=cwd, capture_output=True, text=True, timeout=self.timeout
            )
            return result.returncode == 0, result.stdout.strip(), result.stderr.strip()
        except Exception as e:
            return False, "", str(e)

    def clone(self, repo_url: str, target_path: Path, branch: str = "main") -> bool:
        """克隆仓库"""
        cmd = ["git", "clone", "--branch", branch, repo_url, str(target_path)]
        success, _, _ = self._run_command(cmd)
        return success

    def pull(self, repo_path: Path) -> bool:
        """拉取更新"""
        cmd = ["git", "pull"]
        success, _, _ = self._run_command(cmd, cwd=repo_path)
        return success

    def fetch(self, repo_path: Path) -> bool:
        """获取远程更新"""
        cmd = ["git", "fetch"]
        success, _, _ = self._run_command(cmd, cwd=repo_path)
        return success

    def get_local_commit_hash(self, repo_path: Path) -> Optional[str]:
        """获取本地 commit hash"""
        cmd = ["git", "rev-parse", "HEAD"]
        success, stdout, _ = self._run_command(cmd, cwd=repo_path)
        return stdout if success else None

    def get_remote_commit_hash(self, repo_path: Path, branch: str = "main") -> Optional[str]:
        """获取远程 commit hash"""
        self.fetch(repo_path)
        cmd = ["git", "rev-parse", f"origin/{branch}"]
        success, stdout, _ = self._run_command(cmd, cwd=repo_path)
        return stdout if success else None

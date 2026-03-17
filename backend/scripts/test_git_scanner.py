#!/usr/bin/env python3
"""
测试 Git 仓库扫描和初始化流程
"""
import asyncio
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.git_repo_scanner import GitRepoScanner
from app.core.logging import get_logger

logger = get_logger(__name__)


async def test_git_scanner():
    """测试 Git 仓库扫描器"""
    print("=" * 60)
    print("测试 Git 仓库扫描器")
    print("=" * 60)

    scanner = GitRepoScanner()
    base_dirs = ["/mnt", str(Path.home())]

    print(f"\n扫描目录: {base_dirs}")
    print(f"最大深度: 3")
    print(f"最大仓库数: 20\n")

    repos = scanner.scan_directories(base_dirs, max_depth=3, max_repos=20)

    print(f"✅ 扫描完成！发现 {len(repos)} 个 Git 仓库:\n")
    for i, repo in enumerate(repos, 1):
        print(f"  {i:2d}. {repo}")

    print("\n" + "=" * 60)
    return repos


async def main():
    """主函数"""
    try:
        repos = await test_git_scanner()
        print(f"\n✅ 测试通过！共发现 {len(repos)} 个仓库")
        return 0
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)

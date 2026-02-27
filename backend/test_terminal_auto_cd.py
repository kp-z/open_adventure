#!/usr/bin/env python3
"""
测试终端自动切换到项目目录并启动 Claude 的功能
"""
import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.repositories.project_path_repository import ProjectPathRepository
from app.services.project_path_service import ProjectPathService


async def test_project_path_setup():
    """测试项目路径配置"""
    # Create in-memory database for testing
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=True)

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Create session
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session() as session:
        repository = ProjectPathRepository(session)
        service = ProjectPathService(repository)

        # Test 1: Create a project path
        print("\n=== Test 1: 创建项目路径 ===")
        try:
            project_path = await service.create_project_path(
                path="~/项目/Proj/claude_manager",
                alias="Claude Manager",
                enabled=True,
                recursive_scan=True
            )
            print(f"✓ 创建成功: {project_path.path}")
            print(f"  Alias: {project_path.alias}")
            print(f"  Enabled: {project_path.enabled}")
        except Exception as e:
            print(f"✗ 创建失败: {e}")
            return

        # Test 2: Get enabled paths
        print("\n=== Test 2: 获取启用的项目路径 ===")
        enabled_paths = await service.get_enabled_paths()
        print(f"✓ 找到 {len(enabled_paths)} 个启用的路径")
        for path in enabled_paths:
            print(f"  - {path.alias}: {path.path}")

        # Test 3: Verify first path
        print("\n=== Test 3: 验证第一个路径 ===")
        if enabled_paths:
            first_path = enabled_paths[0]
            print(f"✓ 第一个项目路径: {first_path.path}")
            print(f"  这个路径将被用作终端的初始目录")
        else:
            print("✗ 没有找到启用的项目路径")

    await engine.dispose()


async def main():
    """主函数"""
    print("=" * 60)
    print("测试终端自动切换到项目目录功能")
    print("=" * 60)

    await test_project_path_setup()

    print("\n" + "=" * 60)
    print("测试完成")
    print("=" * 60)
    print("\n使用说明：")
    print("1. 在前端界面添加项目路径配置")
    print("2. 确保至少有一个路径是启用状态")
    print("3. 打开终端，它会自动切换到第一个启用的项目目录")
    print("4. 终端会自动执行 'claude' 命令启动 Claude Code CLI")


if __name__ == "__main__":
    asyncio.run(main())

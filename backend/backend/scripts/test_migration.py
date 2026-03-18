#!/usr/bin/env python3
"""
测试自动迁移功能

模拟老版本数据库升级到新版本的场景
"""
import sys
import os
import tempfile
import shutil
from pathlib import Path

# 添加 backend 目录到 Python 路径
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.database.migration import auto_migrate, get_current_revision, get_head_revision


def test_auto_migration():
    """测试自动迁移功能"""
    print("=" * 60)
    print("测试自动迁移功能")
    print("=" * 60)
    print()

    # 创建临时数据库
    temp_dir = tempfile.mkdtemp()
    test_db_path = Path(temp_dir) / "test.db"
    test_db_url = f"sqlite:///{test_db_path}"

    print(f"📁 临时数据库: {test_db_path}")
    print()

    try:
        # 1. 测试全新数据库的迁移
        print("1️⃣  测试场景：全新数据库")
        print("-" * 60)

        current = get_current_revision(test_db_url)
        head = get_head_revision()

        print(f"   当前版本: {current or '未初始化'}")
        print(f"   目标版本: {head}")
        print()

        print("   执行自动迁移...")
        success = auto_migrate(test_db_url)

        if success:
            print("   ✅ 迁移成功")
            new_current = get_current_revision(test_db_url)
            print(f"   新版本: {new_current}")

            if new_current == head:
                print("   ✅ 数据库已更新到最新版本")
            else:
                print(f"   ⚠️  版本不匹配: {new_current} != {head}")
        else:
            print("   ❌ 迁移失败")

        print()

        # 2. 测试已是最新版本的数据库
        print("2️⃣  测试场景：数据库已是最新版本")
        print("-" * 60)

        print("   执行自动迁移...")
        success = auto_migrate(test_db_url)

        if success:
            print("   ✅ 检查通过（无需迁移）")
        else:
            print("   ❌ 检查失败")

        print()

        # 3. 验证数据库表结构
        print("3️⃣  验证数据库表结构")
        print("-" * 60)

        from sqlalchemy import create_engine, inspect

        engine = create_engine(test_db_url)
        inspector = inspect(engine)

        tables = inspector.get_table_names()
        print(f"   数据库表数量: {len(tables)}")

        # 检查 executions 表是否有新字段
        if "executions" in tables:
            columns = [col["name"] for col in inspector.get_columns("executions")]
            required_columns = [
                "process_pid",
                "work_dir",
                "log_file",
                "terminal_pid",
                "terminal_command",
                "terminal_cwd",
                "terminal_output",
            ]

            print(f"   executions 表字段数量: {len(columns)}")

            missing_columns = [col for col in required_columns if col not in columns]

            if missing_columns:
                print(f"   ❌ 缺少字段: {', '.join(missing_columns)}")
            else:
                print(f"   ✅ 所有必需字段都存在")
        else:
            print("   ⚠️  executions 表不存在")

        print()
        print("=" * 60)
        print("测试完成")
        print("=" * 60)

    finally:
        # 清理临时文件
        shutil.rmtree(temp_dir, ignore_errors=True)
        print(f"\n🧹 已清理临时文件: {temp_dir}")


if __name__ == "__main__":
    test_auto_migration()

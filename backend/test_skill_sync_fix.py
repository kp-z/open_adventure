#!/usr/bin/env python3
"""
测试 Skill 同步修复

验证：
1. scope 字段是否被正确排除
2. Skills 是否能成功创建到数据库
"""
import asyncio
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent))

from app.core.database import get_db
from app.repositories.skill_repository import SkillRepository
from app.schemas.skill import SkillCreate
from app.models.skill import SkillSource


async def test_skill_creation():
    """测试 skill 创建（包含 scope 字段）"""
    print("=" * 60)
    print("测试 Skill 创建（包含 scope 字段）")
    print("=" * 60)

    # 创建测试数据（包含 scope 字段）
    test_skill = SkillCreate(
        name="test-skill",
        full_name="test-skill",
        type="general",
        description="Test skill with scope field",
        tags=["test"],
        source=SkillSource.USER,
        enabled=True,
        meta={"path": "/test/path"},
        scope="user",  # 这个字段应该被排除
        scripts={"test.sh": "echo test"},  # 这个字段应该被排除
        references={"ref.md": "# Test"}  # 这个字段应该被排除
    )

    print(f"\n创建的 SkillCreate 对象:")
    print(f"  - name: {test_skill.name}")
    print(f"  - scope: {test_skill.scope}")
    print(f"  - scripts: {test_skill.scripts}")
    print(f"  - references: {test_skill.references}")

    # 获取数据库会话
    async for session in get_db():
        try:
            repo = SkillRepository(session)

            # 尝试创建 skill
            print("\n尝试创建 skill...")
            created_skill = await repo.create(test_skill)

            print(f"✅ Skill 创建成功!")
            print(f"  - ID: {created_skill.id}")
            print(f"  - Name: {created_skill.name}")
            print(f"  - Source: {created_skill.source}")
            print(f"  - Meta: {created_skill.meta}")

            # 验证 scope 字段没有被保存
            if hasattr(created_skill, 'scope'):
                print(f"❌ 错误: scope 字段不应该存在于 ORM 模型中")
                return False
            else:
                print(f"✅ 正确: scope 字段已被排除")

            # 清理测试数据
            await repo.delete(created_skill.id)
            print(f"\n✅ 测试数据已清理")

            return True

        except Exception as e:
            print(f"\n❌ 创建失败: {e}")
            print(f"错误类型: {type(e).__name__}")
            import traceback
            traceback.print_exc()
            return False


async def main():
    """主函数"""
    print("\n" + "=" * 60)
    print("Skill 同步修复验证")
    print("=" * 60)

    success = await test_skill_creation()

    print("\n" + "=" * 60)
    if success:
        print("✅ 所有测试通过")
        print("=" * 60)
        return 0
    else:
        print("❌ 测试失败")
        print("=" * 60)
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)

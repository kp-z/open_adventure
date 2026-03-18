"""
初始化测试树脚本
"""

import asyncio
from app.core.database import AsyncSessionLocal
from app.testing.test_tree import TestTreeManager


async def init_test_tree():
    """初始化测试树"""
    async with AsyncSessionLocal() as db:
        manager = TestTreeManager()
        await manager.load_tree(db)
        print("测试树已初始化")

        # 显示测试树
        tree = await manager.get_tree(db)
        print(f"\n加载了 {len(tree)} 个根节点")

        for node in tree:
            print(f"- {node['name']} ({node['type']})")
            if node.get('children'):
                for child in node['children']:
                    print(f"  - {child['name']} ({child['type']})")
                    if child.get('children'):
                        for subchild in child['children']:
                            print(f"    - {subchild['name']} ({subchild['type']})")


if __name__ == "__main__":
    asyncio.run(init_test_tree())

"""
测试树管理器
"""

import yaml
from pathlib import Path
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.testing.models import TestNode, TestNodeType


class TestTreeManager:
    """测试树管理器"""

    def __init__(self, config_path: str = None):
        if config_path is None:
            from app.core.path_resolver import get_test_config_path
            config_path = get_test_config_path()
        self.config_path = Path(config_path)

    async def load_tree(self, db: AsyncSession) -> List[TestNode]:
        """从 YAML 加载测试树"""
        with open(self.config_path, 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f)

        # 清空现有测试树
        await db.execute(delete(TestNode))

        # 递归创建测试节点
        for node_config in config['test_tree']:
            await self._create_node(node_config, None, db)

        await db.commit()

        # 返回根节点
        result = await db.execute(
            select(TestNode)
            .where(TestNode.parent_id.is_(None))
            .order_by(TestNode.order)
        )
        return list(result.scalars().all())

    async def _create_node(
        self,
        config: Dict[str, Any],
        parent_id: Optional[str],
        db: AsyncSession
    ) -> TestNode:
        """递归创建测试节点"""
        node = TestNode(
            id=config['id'],
            name=config['name'],
            type=config['type'],
            parent_id=parent_id,
            test_file=config.get('test_file'),
            test_command=config.get('test_command', 'pytest'),
            enabled=config.get('enabled', True),
            order=config.get('order', 0)
        )

        db.add(node)
        await db.flush()

        # 递归创建子节点
        if 'children' in config:
            for child_config in config['children']:
                await self._create_node(child_config, node.id, db)

        return node

    async def get_tree(self, db: AsyncSession) -> List[Dict[str, Any]]:
        """获取完整的测试树（树形结构）"""
        # 获取所有根节点
        result = await db.execute(
            select(TestNode)
            .where(TestNode.parent_id.is_(None))
            .order_by(TestNode.order)
        )
        root_nodes = list(result.scalars().all())

        # 递归构建树形结构
        tree = []
        for node in root_nodes:
            tree.append(await self._build_tree_node(node, db))

        return tree

    async def _build_tree_node(
        self,
        node: TestNode,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """递归构建树形节点"""
        from app.testing.models import TestExecution
        from sqlalchemy import desc

        # 获取最近一次执行记录
        result = await db.execute(
            select(TestExecution)
            .where(TestExecution.test_node_id == node.id)
            .order_by(desc(TestExecution.started_at))
            .limit(1)
        )
        last_execution = result.scalar_one_or_none()

        node_dict = {
            'id': node.id,
            'name': node.name,
            'type': node.type,
            'enabled': node.enabled,
            'test_file': node.test_file,
            'test_command': node.test_command,
            'last_execution': None,
            'children': []
        }

        if last_execution:
            node_dict['last_execution'] = {
                'id': last_execution.id,
                'status': last_execution.status,
                'duration': last_execution.duration,
                'passed': last_execution.passed_tests,
                'failed': last_execution.failed_tests,
                'total': last_execution.total_tests,
                'started_at': last_execution.started_at.isoformat() if last_execution.started_at else None
            }

        # 递归获取子节点
        result = await db.execute(
            select(TestNode)
            .where(TestNode.parent_id == node.id)
            .order_by(TestNode.order)
        )
        children = list(result.scalars().all())

        for child in children:
            node_dict['children'].append(await self._build_tree_node(child, db))

        return node_dict

    async def get_node(self, node_id: str, db: AsyncSession) -> Optional[TestNode]:
        """获取单个测试节点"""
        result = await db.execute(
            select(TestNode).where(TestNode.id == node_id)
        )
        return result.scalar_one_or_none()

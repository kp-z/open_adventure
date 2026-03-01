"""
执行记录仓储
"""
from typing import List, Optional, Dict, Any
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.task import Execution, NodeExecution
from app.repositories.base import BaseRepository


class ExecutionRepository(BaseRepository[Execution]):
    """执行记录仓储"""

    def __init__(self, db: AsyncSession):
        super().__init__(Execution, db)

    async def get_node_executions(self, execution_id: int) -> List[NodeExecution]:
        """
        获取执行的所有节点记录

        Args:
            execution_id: 执行 ID

        Returns:
            List[NodeExecution]: 节点执行记录列表
        """
        result = await self.db.execute(
            select(NodeExecution)
            .where(NodeExecution.execution_id == execution_id)
            .order_by(NodeExecution.started_at)
        )
        return result.scalars().all()

    async def get_by_task_id(self, task_id: int) -> List[Execution]:
        """
        根据任务 ID 获取执行记录

        Args:
            task_id: 任务 ID

        Returns:
            List[Execution]: 执行记录列表
        """
        result = await self.db.execute(
            select(Execution)
            .where(Execution.task_id == task_id)
            .order_by(Execution.created_at.desc())
        )
        return result.scalars().all()

    async def get_by_workflow_id(self, workflow_id: int) -> List[Execution]:
        """
        根据工作流 ID 获取执行记录

        Args:
            workflow_id: 工作流 ID

        Returns:
            List[Execution]: 执行记录列表
        """
        result = await self.db.execute(
            select(Execution)
            .where(Execution.workflow_id == workflow_id)
            .order_by(Execution.created_at.desc())
        )
        return result.scalars().all()

    async def count_by_type(self) -> Dict[str, int]:
        """
        统计各类型的执行数量

        Returns:
            Dict[str, int]: {"workflow": 10, "agent_test": 5, "agent_team": 0}
        """
        from app.models.task import ExecutionType

        result = {}
        for exec_type in ExecutionType:
            count_result = await self.db.execute(
                select(func.count())
                .select_from(Execution)
                .where(Execution.execution_type == exec_type)
            )
            result[exec_type.value] = count_result.scalar_one()

        return result

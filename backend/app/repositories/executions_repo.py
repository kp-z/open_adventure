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

    async def get_by_session_id(self, session_id: str) -> Optional[Execution]:
        """
        根据 session_id 获取执行记录

        Args:
            session_id: Terminal session ID

        Returns:
            Optional[Execution]: 执行记录，如果不存在则返回 None
        """
        result = await self.db.execute(
            select(Execution)
            .where(Execution.session_id == session_id)
            .order_by(Execution.created_at.desc())
        )
        return result.scalars().first()

    async def get_active_sessions(self) -> List[Execution]:
        """
        获取所有活跃的 session 执行记录（状态为 running 或 pending）

        Returns:
            List[Execution]: 活跃的执行记录列表
        """
        from app.models.task import ExecutionStatus

        result = await self.db.execute(
            select(Execution)
            .where(
                Execution.session_id.isnot(None),
                Execution.status.in_([ExecutionStatus.RUNNING, ExecutionStatus.PENDING])
            )
            .order_by(Execution.last_activity_at.desc())
        )
        return result.scalars().all()

    async def create_terminal_execution(
        self,
        command: str,
        cwd: str,
        pid: Optional[int] = None
    ) -> Execution:
        """
        创建 Terminal 执行记录

        Args:
            command: 执行的命令
            cwd: 工作目录
            pid: 进程 ID

        Returns:
            Execution: 创建的执行记录
        """
        from app.models.task import ExecutionType, ExecutionStatus, Task
        from datetime import datetime

        # 创建一个虚拟 Task（Terminal 不需要真实的 Task）
        task = Task(
            title=f"Terminal: {command[:50]}",
            description=f"Terminal command execution: {command}",
            status="pending"
        )
        self.db.add(task)
        await self.db.flush()

        # 创建 Execution
        execution = Execution(
            task_id=task.id,
            workflow_id=0,  # Terminal 不需要 workflow
            execution_type=ExecutionType.TERMINAL,
            status=ExecutionStatus.RUNNING,
            terminal_command=command,
            terminal_cwd=cwd,
            terminal_pid=pid,
            started_at=datetime.utcnow()
        )

        self.db.add(execution)
        await self.db.commit()
        await self.db.refresh(execution)

        return execution

    async def update_terminal_execution(
        self,
        execution_id: int,
        status: Optional[Any] = None,
        output: Optional[str] = None,
        error_message: Optional[str] = None
    ) -> Execution:
        """
        更新 Terminal 执行记录

        Args:
            execution_id: 执行 ID
            status: 执行状态
            output: 命令输出
            error_message: 错误信息

        Returns:
            Execution: 更新后的执行记录
        """
        from datetime import datetime

        execution = await self.get(execution_id)
        if not execution:
            raise ValueError(f"Execution {execution_id} not found")

        if status is not None:
            execution.status = status
            if status in ["succeeded", "failed", "cancelled"]:
                execution.finished_at = datetime.utcnow()

        if output is not None:
            # 限制输出大小（最大 10MB）
            max_size = 10 * 1024 * 1024
            if len(output) > max_size:
                output = output[-max_size:] + "\n... (output truncated)"
            execution.terminal_output = output

        if error_message is not None:
            execution.error_message = error_message

        await self.db.commit()
        await self.db.refresh(execution)

        return execution

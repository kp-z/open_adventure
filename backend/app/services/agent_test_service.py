"""
Agent 测试执行服务
负责创建和执行 Agent 测试任务
"""
from datetime import datetime
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.task import Execution, ExecutionStatus, ExecutionType, Task
from app.services.websocket_manager import ConnectionManager
import logging

logger = logging.getLogger(__name__)

class AgentTestService:
    """Agent 测试服务"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_agent_test_execution(
        self,
        agent_id: int,
        test_input: str
    ) -> Execution:
        """
        创建 Agent 测试执行记录

        Args:
            agent_id: Agent ID
            test_input: 测试输入

        Returns:
            Execution: 执行记录
        """
        # 创建一个临时 Task
        task = Task(
            title=f"Agent Test #{agent_id}",
            description=f"Testing agent {agent_id}",
            status="pending"
        )
        self.db.add(task)
        await self.db.flush()

        # 创建执行记录
        execution = Execution(
            task_id=task.id,
            workflow_id=1,  # 临时使用 workflow_id=1
            execution_type=ExecutionType.AGENT_TEST,
            agent_id=agent_id,
            test_input=test_input,
            status=ExecutionStatus.PENDING,
            created_at=datetime.utcnow()
        )

        self.db.add(execution)
        await self.db.commit()
        await self.db.refresh(execution)

        logger.info(f"Created agent test execution {execution.id} for agent {agent_id}")
        return execution

    async def execute_agent_test(
        self,
        execution_id: int,
        manager: ConnectionManager
    ):
        """
        执行 Agent 测试（后台任务）

        Args:
            execution_id: 执行 ID
            manager: WebSocket 管理器
        """
        try:
            # 获取执行记录
            result = await self.db.execute(
                select(Execution).where(Execution.id == execution_id)
            )
            execution = result.scalar_one()

            # 更新状态为 RUNNING
            execution.status = ExecutionStatus.RUNNING
            execution.started_at = datetime.utcnow()
            await self.db.commit()

            # 广播状态更新
            await manager.broadcast_execution_update({
                "id": execution.id,
                "status": "running",
                "execution_type": "agent_test",
                "agent_id": execution.agent_id,
                "started_at": execution.started_at.isoformat()
            })

            # 模拟 Agent 执行（实际应该调用 Claude API）
            import asyncio
            await asyncio.sleep(2)  # 模拟执行时间
            
            test_output = f"Agent {execution.agent_id} 测试完成。输入：{execution.test_input}"

            # 更新状态为 SUCCEEDED
            execution.status = ExecutionStatus.SUCCEEDED
            execution.test_output = test_output
            execution.finished_at = datetime.utcnow()
            await self.db.commit()

            # 广播完成状态
            await manager.broadcast_execution_update({
                "id": execution.id,
                "status": "succeeded",
                "execution_type": "agent_test",
                "agent_id": execution.agent_id,
                "test_output": test_output,
                "finished_at": execution.finished_at.isoformat()
            })

            logger.info(f"Agent test execution {execution_id} succeeded")

        except Exception as e:
            logger.error(f"Agent test execution {execution_id} failed: {e}")

            # 更新状态为 FAILED
            execution.status = ExecutionStatus.FAILED
            execution.error_message = str(e)
            execution.finished_at = datetime.utcnow()
            await self.db.commit()

            # 广播失败状态
            await manager.broadcast_execution_update({
                "id": execution.id,
                "status": "failed",
                "execution_type": "agent_test",
                "agent_id": execution.agent_id,
                "error": str(e),
                "finished_at": execution.finished_at.isoformat()
            })

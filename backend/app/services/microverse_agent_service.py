"""
Microverse Agent Service
处理 Microverse 游戏的 Agent 对话请求
"""
import asyncio
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException

from app.models.agent import Agent, AgentFramework
from app.models.task import Task, Execution, ExecutionStatus, ExecutionType
from app.repositories.agent_repository import AgentRepository
from app.core.logging import get_logger

logger = get_logger(__name__)

class MicroverseAgentService:
    """Microverse Agent 服务"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.agent_repo = AgentRepository(db)

    async def process_chat(self, request) -> Dict[str, Any]:
        """
        处理 Microverse 角色的对话请求

        Args:
            request: ChatRequest 对象

        Returns:
            Dict: 对话响应
        """
        # 1. 查找或创建对应的 Agent
        agent = await self._get_or_create_agent(
            request.character_name,
            request.api_type,
            request.model
        )

        # 2. 创建 Task 和 Execution
        task = Task(
            title=f"Microverse Chat: {request.character_name}",
            description=request.prompt,
            status="running",
            agent_id=agent.id
        )
        self.db.add(task)
        await self.db.flush()

        execution = Execution(
            task_id=task.id,
            workflow_id=1,  # 虚拟 workflow
            execution_type=ExecutionType.AGENT_TEST,
            agent_id=agent.id,
            status=ExecutionStatus.RUNNING,
            test_input=request.prompt
        )
        self.db.add(execution)
        await self.db.commit()
        await self.db.refresh(execution)

        # 3. 调用 AI API（同步等待结果）
        try:
            response_text = await self._call_ai_api(
                agent,
                request.prompt,
                request.context
            )

            # 4. 更新 Execution 状态
            execution.status = ExecutionStatus.SUCCEEDED
            execution.test_output = response_text
            await self.db.commit()

            return {
                "character_name": request.character_name,
                "response": response_text,
                "execution_id": execution.id,
                "status": "success"
            }

        except Exception as e:
            logger.error(f"Chat failed for {request.character_name}: {e}")
            execution.status = ExecutionStatus.FAILED
            execution.error_message = str(e)
            await self.db.commit()

            raise HTTPException(status_code=500, detail=str(e))

    async def _get_or_create_agent(
        self,
        character_name: str,
        api_type: Optional[str],
        model: Optional[str]
    ) -> Agent:
        """获取或创建 Microverse 角色对应的 Agent"""
        # 查找已存在的 Agent
        result = await self.db.execute(
            select(Agent).where(
                Agent.name == f"microverse_{character_name}"
            )
        )
        agent = result.scalar_one_or_none()

        if agent:
            return agent

        # 创建新 Agent
        agent = Agent(
            name=f"microverse_{character_name}",
            description=f"Microverse character: {character_name}",
            framework=AgentFramework.HYBRID,
            model=model or "gpt-4o-mini",
            system_prompt=f"You are {character_name}, a character in Microverse.",
            category="microverse",
            tags=["microverse", character_name]
        )
        self.db.add(agent)
        await self.db.commit()
        await self.db.refresh(agent)

        logger.info(f"Created new agent for Microverse character: {character_name}")
        return agent

    async def _call_ai_api(
        self,
        agent: Agent,
        prompt: str,
        context: Optional[Dict[str, Any]]
    ) -> str:
        """
        调用 AI API 获取响应

        这里需要根据 agent.model 调用对应的 AI API
        可以复用现有的 API 调用逻辑
        """
        # TODO: 实现实际的 AI API 调用
        # 可以参考 agent_test_service.py 中的实现

        # 临时模拟响应
        await asyncio.sleep(1)
        return f"[{agent.name}] Response to: {prompt[:50]}..."

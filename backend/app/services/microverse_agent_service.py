"""
Microverse Agent Service
处理 Microverse 游戏的 Agent 对话请求和角色管理
"""
import asyncio
import json
from datetime import datetime
from typing import Dict, Any, Optional, List

from anthropic import AsyncAnthropic
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException

from app.config.settings import settings
from app.models.agent import Agent, AgentFramework
from app.models.task import Task, TaskStatus, Execution, ExecutionStatus, ExecutionType
from app.models.microverse import MicroverseCharacter
from app.repositories.agent_repository import AgentRepository
from app.services.agent_runtime_service import AgentRuntimeService
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
        # 1. 优先使用已绑定角色的 Agent，否则回退到 microverse_{name} 自动 Agent
        agent = await self._resolve_chat_agent(
            request.character_name,
            request.api_type,
            request.model
        )

        # 2. 创建 Task 和 Execution（短生命周期审计记录，直接设为 RUNNING 跳过 PENDING）
        task = Task(
            title=f"Microverse Chat: {request.character_name}",
            description=request.prompt,
            status=TaskStatus.RUNNING,
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
                request.context,
                model_override=request.model,
            )

            # 4. 更新 Execution 状态
            execution.status = ExecutionStatus.SUCCEEDED
            execution.test_output = response_text
            execution.finished_at = datetime.utcnow()
            await self.db.commit()

            return {
                "character_name": request.character_name,
                "response": response_text,
                "execution_id": execution.id,
                "status": "success"
            }

        except Exception as e:
            logger.error(f"Chat failed for {request.character_name}: {e}", exc_info=True)
            execution.status = ExecutionStatus.FAILED
            execution.error_message = str(e)
            await self.db.commit()

            raise HTTPException(status_code=500, detail="AI 服务暂时不可用，请稍后重试")

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

    async def _resolve_chat_agent(
        self,
        character_name: str,
        api_type: Optional[str],
        model: Optional[str],
    ) -> Agent:
        """若 Microverse 角色已绑定平台 Agent，则使用该 Agent；否则使用 microverse_{name}。"""
        character = await self.get_character(character_name)
        if character and character.agent_id:
            agent_result = await self.db.execute(
                select(Agent).where(Agent.id == character.agent_id)
            )
            bound = agent_result.scalar_one_or_none()
            if bound:
                return bound
        return await self._get_or_create_agent(character_name, api_type, model)

    @staticmethod
    def _normalize_anthropic_model(model: Optional[str]) -> str:
        """将简称或旧名映射为 Anthropic API 模型 id。"""
        if not model:
            return "claude-sonnet-4-6"
        m = model.strip()
        mapping = {
            "opus": "claude-opus-4-6",
            "sonnet": "claude-sonnet-4-6",
            "haiku": "claude-3-5-haiku-20241022",
            "inherit": "claude-sonnet-4-6",
            "gpt-4o-mini": "claude-sonnet-4-6",
        }
        if m in mapping:
            return mapping[m]
        return m

    async def _call_ai_api(
        self,
        agent: Agent,
        prompt: str,
        context: Optional[Dict[str, Any]],
        model_override: Optional[str] = None,
        chat_history: Optional[List[Dict[str, Any]]] = None,
    ) -> str:
        """
        通过 Anthropic Messages API 生成回复（与 PromptOptimizer 等共用配置来源）。

        需在环境变量中配置 ANTHROPIC_API_KEY。
        """
        api_key = settings.anthropic_api_key
        if not api_key:
            raise RuntimeError(
                "ANTHROPIC_API_KEY 未配置，无法为 Microverse 提供对话；请在环境或 .env 中设置。"
            )

        model = self._normalize_anthropic_model(model_override or agent.model)
        system_parts: List[str] = []
        if agent.system_prompt:
            system_parts.append(agent.system_prompt)
        if context:
            system_parts.append(
                "游戏上下文（JSON）:\n" + json.dumps(context, ensure_ascii=False)
            )
        system = (
            "\n\n".join(system_parts)
            if system_parts
            else "你是 Microverse 游戏中的角色，请用自然、简洁的语言回复玩家。"
        )

        # 构建消息列表：包含历史对话 + 当前消息
        messages = []
        if chat_history:
            for msg in chat_history:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                if role in ("user", "assistant") and content:
                    messages.append({"role": role, "content": content})
        messages.append({"role": "user", "content": prompt})

        async with AsyncAnthropic(api_key=api_key) as client:
            response = await client.messages.create(
                model=model,
                max_tokens=1024,
                system=system,
                messages=messages,
            )

        for block in response.content:
            if getattr(block, "type", None) == "text":
                return block.text
        return ""

    # ===== 角色管理方法 =====

    async def create_or_get_character(
        self,
        character_name: str,
        display_name: Optional[str] = None,
        agent_id: Optional[int] = None,
        meta: Optional[dict] = None
    ) -> MicroverseCharacter:
        """创建或获取角色"""
        # 查找已存在的角色
        result = await self.db.execute(
            select(MicroverseCharacter).where(
                MicroverseCharacter.character_name == character_name
            )
        )
        character = result.scalar_one_or_none()

        if character:
            return character

        # 创建新角色
        character = MicroverseCharacter(
            character_name=character_name,
            display_name=display_name or character_name,
            agent_id=agent_id,
            is_working=False,
            meta=meta or {}
        )
        self.db.add(character)
        await self.db.commit()
        await self.db.refresh(character)

        logger.info(f"Created new Microverse character: {character_name}")
        return character

    async def get_character(self, character_name: str) -> Optional[MicroverseCharacter]:
        """获取角色"""
        result = await self.db.execute(
            select(MicroverseCharacter).where(
                MicroverseCharacter.character_name == character_name
            )
        )
        return result.scalar_one_or_none()

    async def list_characters(self) -> List[MicroverseCharacter]:
        """获取所有角色列表"""
        result = await self.db.execute(select(MicroverseCharacter))
        return list(result.scalars().all())

    async def bind_character_to_agent(
        self,
        character_name: str,
        agent_id: int
    ) -> MicroverseCharacter:
        """绑定角色到 Agent"""
        # 检查 Agent 是否存在
        agent_result = await self.db.execute(
            select(Agent).where(Agent.id == agent_id)
        )
        agent = agent_result.scalar_one_or_none()
        if not agent:
            raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")

        # 获取或创建角色
        character = await self.create_or_get_character(character_name)

        # 绑定 Agent
        character.agent_id = agent_id
        await self.db.commit()
        await self.db.refresh(character)

        logger.info(f"Bound character {character_name} to agent {agent_id}")
        return character

    async def unbind_character(self, character_name: str) -> MicroverseCharacter:
        """解绑角色"""
        character = await self.get_character(character_name)
        if not character:
            raise HTTPException(status_code=404, detail=f"Character {character_name} not found")

        character.agent_id = None
        await self.db.commit()
        await self.db.refresh(character)

        logger.info(f"Unbound character {character_name}")
        return character

    async def get_character_info(self, character_name: str) -> Dict[str, Any]:
        """获取角色完整信息（包括绑定的 Agent）"""
        result = await self.db.execute(
            select(MicroverseCharacter).where(
                MicroverseCharacter.character_name == character_name
            )
        )
        character = result.scalar_one_or_none()

        # 如果角色不存在，自动创建一个空角色记录
        if not character:
            character = await self.create_or_get_character(
                character_name=character_name,
                display_name=character_name
            )

        # 获取绑定的 Agent 信息
        agent_info = None
        if character.agent_id:
            agent_result = await self.db.execute(
                select(Agent).where(Agent.id == character.agent_id)
            )
            agent = agent_result.scalar_one_or_none()
            if agent:
                agent_info = {
                    "id": agent.id,
                    "name": agent.name,
                    "description": agent.description,
                    "framework": agent.framework.value,
                    "model": agent.model
                }

        # 获取当前执行信息
        execution_info = None
        if character.current_execution_id:
            exec_result = await self.db.execute(
                select(Execution).where(Execution.id == character.current_execution_id)
            )
            execution = exec_result.scalar_one_or_none()
            if execution:
                execution_info = {
                    "id": execution.id,
                    "status": execution.status.value,
                    "started_at": execution.started_at.isoformat() if execution.started_at else None,
                    "process_pid": execution.process_pid
                }

        return {
            "id": character.id,
            "character_name": character.character_name,
            "display_name": character.display_name,
            "agent_id": character.agent_id,
            "agent": agent_info,
            "is_working": character.is_working,
            "current_execution_id": character.current_execution_id,
            "current_execution": execution_info,
            "meta": character.meta,
            "created_at": character.created_at.isoformat(),
            "updated_at": character.updated_at.isoformat()
        }

    # ===== 工作管理方法 =====

    async def start_character_work(
        self,
        character_name: str,
        task_description: str,
        project_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """启动角色工作：统一委托 AgentRuntimeService（claude --agent + Task/Execution/监控）。"""
        # 步骤 1：获取角色并校验绑定与工作态
        character = await self.get_character(character_name)
        if not character:
            raise HTTPException(status_code=404, detail=f"Character {character_name} not found")

        if not character.agent_id:
            raise HTTPException(
                status_code=400,
                detail=f"Character {character_name} is not bound to any agent"
            )

        if character.is_working:
            raise HTTPException(
                status_code=400,
                detail=f"Character {character_name} is already working"
            )

        agent_result = await self.db.execute(
            select(Agent).where(Agent.id == character.agent_id)
        )
        agent = agent_result.scalar_one_or_none()
        if not agent:
            raise HTTPException(status_code=404, detail=f"Agent {character.agent_id} not found")

        # 步骤 2：由 AgentRuntimeService 创建 Task/Execution、启动进程并 commit
        try:
            runtime = AgentRuntimeService(self.db)
            execution = await runtime.start_agent(
                agent=agent,
                task_description=task_description,
                project_path=project_path,
                background=True,
            )
        except Exception as e:
            logger.error(f"AgentRuntimeService.start_agent failed for {character_name}: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to start Agent Runtime: {e}",
            ) from e

        # 步骤 3：更新角色侧状态（独立 commit，失败时回滚并清理进程避免幽灵进程）
        try:
            character.is_working = True
            character.current_execution_id = execution.id
            await self.db.commit()
        except Exception as e:
            logger.error(f"Failed to update character state for {character_name}, cleaning up: {e}")
            # 回滚角色状态并尝试停止已启动的进程
            try:
                await runtime.stop_agent(execution.id)
            except Exception:
                logger.warning(f"Failed to cleanup agent process for execution {execution.id}")
            raise HTTPException(
                status_code=500,
                detail="Failed to update character state",
            ) from e

        logger.info(
            "Started work for character %s via AgentRuntime, execution_id=%s",
            character_name,
            execution.id,
        )

        return {
            "execution_id": execution.id,
            "status": execution.status.value,
            "pid": execution.process_pid,
            "started_at": execution.started_at.isoformat() if execution.started_at else None
        }

    async def stop_character_work(self, character_name: str) -> Dict[str, Any]:
        """停止角色工作"""
        # 获取角色
        character = await self.get_character(character_name)
        if not character:
            raise HTTPException(status_code=404, detail=f"Character {character_name} not found")

        # 检查是否在工作
        if not character.is_working:
            raise HTTPException(
                status_code=400,
                detail=f"Character {character_name} is not working"
            )

        if character.current_execution_id:
            runtime = AgentRuntimeService(self.db)
            try:
                await runtime.stop_agent(character.current_execution_id)
            except ValueError:
                logger.warning(
                    "stop_agent: execution %s not found for character %s",
                    character.current_execution_id,
                    character_name,
                )

        character.is_working = False
        character.current_execution_id = None
        await self.db.commit()

        logger.info(f"Stopped work for character {character_name}")

        return {"success": True}

    async def get_character_runtime_status(self, character_name: str) -> Dict[str, Any]:
        """获取角色的 Runtime 状态（委托 AgentRuntimeService.get_agent_status）。"""
        character = await self.get_character(character_name)
        if not character:
            raise HTTPException(status_code=404, detail=f"Character {character_name} not found")

        if not character.is_working or not character.current_execution_id:
            return {
                "status": "idle",
                "pid": None,
                "started_at": None,
                "cpu_percent": None,
                "memory_mb": None
            }

        exec_result = await self.db.execute(
            select(Execution).where(Execution.id == character.current_execution_id)
        )
        execution = exec_result.scalar_one_or_none()
        if not execution:
            character.is_working = False
            character.current_execution_id = None
            await self.db.commit()
            return {
                "status": "idle",
                "pid": None,
                "started_at": None,
                "cpu_percent": None,
                "memory_mb": None
            }

        runtime = AgentRuntimeService(self.db)
        try:
            st = await runtime.get_agent_status(character.current_execution_id)
        except ValueError:
            character.is_working = False
            character.current_execution_id = None
            await self.db.commit()
            return {
                "status": "idle",
                "pid": None,
                "started_at": None,
                "cpu_percent": None,
                "memory_mb": None
            }

        # 进程已退出：同步 DB 与角色状态
        if st.get("status") == "stopped" and execution.status == ExecutionStatus.RUNNING:
            execution.status = ExecutionStatus.FAILED
            execution.finished_at = datetime.utcnow()
            character.is_working = False
            character.current_execution_id = None
            await self.db.commit()
            return {
                "status": "failed",
                "pid": None,
                "started_at": execution.started_at,
                "cpu_percent": None,
                "memory_mb": None
            }

        return {
            "status": execution.status.value,
            "pid": st.get("pid"),
            "started_at": execution.started_at,
            "cpu_percent": st.get("cpu_percent"),
            "memory_mb": st.get("memory_mb"),
        }

    async def get_character_work_logs(
        self,
        character_name: str,
        offset: int = 0,
        limit: int = 50
    ) -> Dict[str, Any]:
        """获取角色工作日志（委托 AgentRuntimeService.get_agent_logs）。"""
        character = await self.get_character(character_name)
        if not character:
            raise HTTPException(status_code=404, detail=f"Character {character_name} not found")

        if not character.current_execution_id:
            return {
                "logs": [],
                "total": 0,
                "has_more": False
            }

        runtime = AgentRuntimeService(self.db)
        try:
            return await runtime.get_agent_logs(
                character.current_execution_id,
                offset=offset,
                limit=limit,
            )
        except ValueError:
            return {
                "logs": [],
                "total": 0,
                "has_more": False
            }

    # ===== 任务配置管理方法 =====

    async def add_character_task(
        self,
        character_name: str,
        description: str,
        project_path: Optional[str] = None,
        priority: int = 0,
        auto_execute: bool = False
    ) -> Dict[str, Any]:
        """为角色添加任务配置"""
        # 获取或创建角色
        character = await self.create_or_get_character(character_name)

        # 初始化 meta 中的 tasks 列表
        if not character.meta:
            character.meta = {}
        if "tasks" not in character.meta:
            character.meta["tasks"] = []

        # 生成任务 ID（使用 max 避免删除后 ID 重复）
        existing_tasks = character.meta["tasks"]
        task_id = max((t["id"] for t in existing_tasks), default=0) + 1

        # 添加任务
        task = {
            "id": task_id,
            "description": description,
            "project_path": project_path,
            "priority": priority,
            "auto_execute": auto_execute,
            "created_at": datetime.utcnow().isoformat()
        }
        character.meta["tasks"].append(task)

        # 标记 meta 字段已修改（SQLAlchemy 需要）
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(character, "meta")

        await self.db.commit()
        await self.db.refresh(character)

        logger.info(f"Added task {task_id} to character {character_name}")
        return task

    async def get_character_tasks(self, character_name: str) -> List[Dict[str, Any]]:
        """获取角色的任务配置列表"""
        character = await self.get_character(character_name)
        if not character:
            raise HTTPException(status_code=404, detail=f"Character {character_name} not found")

        if not character.meta or "tasks" not in character.meta:
            return []

        return character.meta["tasks"]

    async def delete_character_task(
        self,
        character_name: str,
        task_id: int
    ) -> Dict[str, bool]:
        """删除角色的任务配置"""
        character = await self.get_character(character_name)
        if not character:
            raise HTTPException(status_code=404, detail=f"Character {character_name} not found")

        if not character.meta or "tasks" not in character.meta:
            raise HTTPException(status_code=404, detail=f"Task {task_id} not found")

        # 查找并删除任务
        tasks = character.meta["tasks"]
        task_index = None
        for i, task in enumerate(tasks):
            if task["id"] == task_id:
                task_index = i
                break

        if task_index is None:
            raise HTTPException(status_code=404, detail=f"Task {task_id} not found")

        # 删除任务
        tasks.pop(task_index)

        # 标记 meta 字段已修改
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(character, "meta")

        await self.db.commit()

        logger.info(f"Deleted task {task_id} from character {character_name}")
        return {"success": True}

    # ===== 对话管理方法 =====

    async def create_conversation(
        self,
        character_name: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """创建对话会话"""
        import uuid

        # 获取或创建角色
        character = await self.create_or_get_character(character_name)

        # 检查是否已绑定 Agent
        if not character.agent_id:
            raise HTTPException(
                status_code=400,
                detail=f"Character {character_name} is not bound to any agent"
            )

        # 生成会话 ID
        session_id = str(uuid.uuid4())

        # 创建 Execution 作为会话容器
        execution = Execution(
            execution_type=ExecutionType.AGENT_TEST,
            agent_id=character.agent_id,
            status=ExecutionStatus.RUNNING,
            session_id=session_id,
            is_background=True,
            chat_history="[]",  # 初始化为空的 JSON 数组
            last_activity_at=datetime.utcnow(),
            started_at=datetime.utcnow()
        )
        self.db.add(execution)
        await self.db.commit()
        await self.db.refresh(execution)

        logger.info(f"Created conversation session {session_id} for character {character_name}")

        return {
            "session_id": session_id,
            "character_name": character_name,
            "agent_id": character.agent_id,
            "created_at": execution.created_at,
            "last_activity_at": execution.last_activity_at
        }

    async def send_message(
        self,
        session_id: str,
        message: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """发送消息到对话会话"""
        import json
        import uuid

        # 查找会话
        result = await self.db.execute(
            select(Execution).where(Execution.session_id == session_id)
        )
        execution = result.scalar_one_or_none()

        if not execution:
            raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

        # 获取 Agent
        agent_result = await self.db.execute(
            select(Agent).where(Agent.id == execution.agent_id)
        )
        agent = agent_result.scalar_one_or_none()

        if not agent:
            raise HTTPException(status_code=404, detail=f"Agent {execution.agent_id} not found")

        # 解析聊天历史
        try:
            chat_history = json.loads(execution.chat_history or "[]")
        except json.JSONDecodeError:
            chat_history = []

        # 添加用户消息
        user_message = {
            "message_id": str(uuid.uuid4()),
            "role": "user",
            "content": message,
            "timestamp": datetime.utcnow().isoformat()
        }
        chat_history.append(user_message)

        # 调用 AI API 获取响应（传入对话历史以支持多轮对话）
        try:
            response_text = await self._call_ai_api(agent, message, context, chat_history=chat_history)

            # 添加助手消息
            assistant_message = {
                "message_id": str(uuid.uuid4()),
                "role": "assistant",
                "content": response_text,
                "timestamp": datetime.utcnow().isoformat()
            }
            chat_history.append(assistant_message)

            # 更新会话
            execution.chat_history = json.dumps(chat_history)
            execution.last_activity_at = datetime.utcnow()
            await self.db.commit()

            logger.info(f"Sent message to session {session_id}, got response")

            return assistant_message

        except Exception as e:
            logger.error(f"Failed to send message to session {session_id}: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    async def get_conversation_history(
        self,
        session_id: str,
        offset: int = 0,
        limit: int = 50
    ) -> Dict[str, Any]:
        """获取对话历史"""
        import json

        # 查找会话
        result = await self.db.execute(
            select(Execution).where(Execution.session_id == session_id)
        )
        execution = result.scalar_one_or_none()

        if not execution:
            raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

        # 解析聊天历史
        try:
            chat_history = json.loads(execution.chat_history or "[]")
        except json.JSONDecodeError:
            chat_history = []

        # 分页
        total = len(chat_history)
        messages = chat_history[offset:offset + limit]

        return {
            "session_id": session_id,
            "messages": messages,
            "total": total
        }


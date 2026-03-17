"""
Microverse Agent Service
处理 Microverse 游戏的 Agent 对话请求和角色管理
"""
import asyncio
import psutil
from datetime import datetime
from typing import Dict, Any, Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException

from app.models.agent import Agent, AgentFramework
from app.models.task import Task, Execution, ExecutionStatus, ExecutionType
from app.models.microverse import MicroverseCharacter
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
        """启动角色工作（后台运行 Agent）"""
        # 获取角色
        character = await self.get_character(character_name)
        if not character:
            raise HTTPException(status_code=404, detail=f"Character {character_name} not found")

        # 检查是否已绑定 Agent
        if not character.agent_id:
            raise HTTPException(
                status_code=400,
                detail=f"Character {character_name} is not bound to any agent"
            )

        # 检查是否已在工作
        if character.is_working:
            raise HTTPException(
                status_code=400,
                detail=f"Character {character_name} is already working"
            )

        # 获取 Agent
        agent_result = await self.db.execute(
            select(Agent).where(Agent.id == character.agent_id)
        )
        agent = agent_result.scalar_one_or_none()
        if not agent:
            raise HTTPException(status_code=404, detail=f"Agent {character.agent_id} not found")

        # 创建 Execution
        execution = Execution(
            execution_type=ExecutionType.AGENT_TEST,
            agent_id=agent.id,
            status=ExecutionStatus.RUNNING,
            test_input=task_description,
            is_background=True,
            work_dir=project_path,
            started_at=datetime.utcnow()
        )
        self.db.add(execution)
        await self.db.flush()

        # 更新角色状态
        character.is_working = True
        character.current_execution_id = execution.id
        await self.db.commit()
        await self.db.refresh(execution)

        # 启动 Agent Runtime（后台进程）
        try:
            import subprocess
            import os

            # 准备日志文件路径
            log_dir = os.path.join(os.getcwd(), "docs", "logs", "microverse")
            os.makedirs(log_dir, exist_ok=True)
            log_file = os.path.join(log_dir, f"character_{character_name}_{execution.id}.log")

            # 构建 Claude Code CLI 命令
            # 使用 --background 模式运行
            cmd = [
                "claude",
                "--background",
                "--project", project_path or os.getcwd(),
                task_description
            ]

            # 启动后台进程
            with open(log_file, "w") as f:
                process = subprocess.Popen(
                    cmd,
                    stdout=f,
                    stderr=subprocess.STDOUT,
                    cwd=project_path or os.getcwd(),
                    start_new_session=True  # 创建新会话，避免被父进程终止
                )

            # 记录进程信息
            execution.process_pid = process.pid
            execution.log_file = log_file
            await self.db.commit()

            logger.info(f"Started Agent Runtime for character {character_name}, pid={process.pid}, execution_id={execution.id}")

        except Exception as e:
            logger.error(f"Failed to start Agent Runtime for {character_name}: {e}")
            execution.status = ExecutionStatus.FAILED
            execution.error_message = str(e)
            character.is_working = False
            character.current_execution_id = None
            await self.db.commit()
            raise HTTPException(status_code=500, detail=f"Failed to start Agent Runtime: {e}")

        logger.info(f"Started work for character {character_name}, execution_id={execution.id}")

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

        # 获取当前执行
        if character.current_execution_id:
            exec_result = await self.db.execute(
                select(Execution).where(Execution.id == character.current_execution_id)
            )
            execution = exec_result.scalar_one_or_none()

            if execution and execution.process_pid:
                # TODO: 停止进程
                # 这里需要调用 AgentRuntimeService 来停止后台进程
                try:
                    process = psutil.Process(execution.process_pid)
                    process.terminate()
                    process.wait(timeout=5)
                except (psutil.NoSuchProcess, psutil.TimeoutExpired):
                    pass

                execution.status = ExecutionStatus.CANCELLED
                execution.finished_at = datetime.utcnow()

        # 更新角色状态
        character.is_working = False
        character.current_execution_id = None
        await self.db.commit()

        logger.info(f"Stopped work for character {character_name}")

        return {"success": True}

    async def get_character_runtime_status(self, character_name: str) -> Dict[str, Any]:
        """获取角色的 Runtime 状态"""
        # 获取角色
        character = await self.get_character(character_name)
        if not character:
            raise HTTPException(status_code=404, detail=f"Character {character_name} not found")

        # 检查是否在工作
        if not character.is_working or not character.current_execution_id:
            return {
                "status": "idle",
                "pid": None,
                "started_at": None,
                "cpu_percent": None,
                "memory_mb": None
            }

        # 获取当前执行
        exec_result = await self.db.execute(
            select(Execution).where(Execution.id == character.current_execution_id)
        )
        execution = exec_result.scalar_one_or_none()

        if not execution or not execution.process_pid:
            return {
                "status": execution.status.value if execution else "unknown",
                "pid": None,
                "started_at": execution.started_at.isoformat() if execution and execution.started_at else None,
                "cpu_percent": None,
                "memory_mb": None
            }

        # 获取进程信息
        try:
            process = psutil.Process(execution.process_pid)
            cpu_percent = process.cpu_percent(interval=0.1)
            memory_info = process.memory_info()
            memory_mb = memory_info.rss / 1024 / 1024

            return {
                "status": execution.status.value,
                "pid": execution.process_pid,
                "started_at": execution.started_at.isoformat() if execution.started_at else None,
                "cpu_percent": cpu_percent,
                "memory_mb": memory_mb
            }
        except psutil.NoSuchProcess:
            # 进程已不存在
            execution.status = ExecutionStatus.FAILED
            execution.finished_at = datetime.utcnow()
            character.is_working = False
            character.current_execution_id = None
            await self.db.commit()

            return {
                "status": "failed",
                "pid": None,
                "started_at": execution.started_at.isoformat() if execution.started_at else None,
                "cpu_percent": None,
                "memory_mb": None
            }

    async def get_character_work_logs(
        self,
        character_name: str,
        offset: int = 0,
        limit: int = 50
    ) -> Dict[str, Any]:
        """获取角色工作日志"""
        # 获取角色
        character = await self.get_character(character_name)
        if not character:
            raise HTTPException(status_code=404, detail=f"Character {character_name} not found")

        # 检查是否在工作
        if not character.is_working or not character.current_execution_id:
            return {
                "logs": [],
                "total": 0,
                "has_more": False
            }

        # 获取当前执行
        exec_result = await self.db.execute(
            select(Execution).where(Execution.id == character.current_execution_id)
        )
        execution = exec_result.scalar_one_or_none()

        if not execution or not execution.log_file:
            return {
                "logs": [],
                "total": 0,
                "has_more": False
            }

        # TODO: 读取日志文件
        # 这里需要实现日志文件读取逻辑
        # 可以参考 AgentRuntimeService 中的实现

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

        # 生成任务 ID
        task_id = len(character.meta["tasks"]) + 1

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

        # 调用 AI API 获取响应
        try:
            response_text = await self._call_ai_api(agent, message, context)

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


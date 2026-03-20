"""
Microverse API Router
为 Microverse 游戏提供 Agent 对话接口和角色管理
"""
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import asyncio
import json

from app.core.database import get_db
from app.repositories.agent_repository import AgentRepository
from app.services.microverse_agent_service import MicroverseAgentService
from app.schemas.microverse import (
    MicroverseCharacterCreate,
    MicroverseCharacterResponse,
    MicroverseCharacterDetailResponse,
    MicroverseCharacterBindAgent,
    StartWorkRequest,
    WorkStatusResponse,
    WorkLogsResponse,
    ConversationCreateRequest,
    ConversationResponse,
    MessageSendRequest,
    MessageResponse,
    ConversationHistoryResponse,
    TaskControlResponse,
    QuestionAnswerRequest,
    QuestionAnswerResponse,
    SessionSaveRequest,
    SessionSaveResponse,
    SessionRestoreRequest,
    SessionRestoreResponse
)

router = APIRouter(prefix="/microverse", tags=["microverse"])


# ===== Agent 列表接口（仅项目级） =====

@router.get("/agents")
async def list_project_agents(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """
    获取项目级 Agent 列表（游戏模式专用）

    只返回 scope="project" 的 agent，忽略 user 和 plugin 类型。

    Args:
        skip: 跳过数量
        limit: 返回数量
        db: 数据库会话

    Returns:
        List[Agent]: 项目级 agent 列表
    """
    repo = AgentRepository(db)
    agents, total = await repo.get_all(
        skip=skip,
        limit=limit,
        scope="project",  # 只返回项目级 agent
        active_only=False
    )

    return {
        "agents": [
            {
                "id": agent.id,
                "name": agent.name,
                "description": agent.description,
                "scope": agent.scope,
                "priority": agent.priority,
                "framework": agent.framework,
                "agent_type": agent.agent_type,
                "is_active": agent.is_active,
                "meta": agent.meta
            }
            for agent in agents
        ],
        "total": total,
        "skip": skip,
        "limit": limit
    }


class ChatRequest(BaseModel):
    """对话请求"""
    character_name: str
    prompt: str
    context: Optional[Dict[str, Any]] = None
    api_type: Optional[str] = None  # OpenAI, Claude, Gemini 等
    model: Optional[str] = None

class ChatResponse(BaseModel):
    """对话响应"""
    character_name: str
    response: str
    execution_id: int
    status: str

@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Microverse 角色对话接口

    Args:
        request: 对话请求
        db: 数据库会话

    Returns:
        ChatResponse: 对话响应
    """
    service = MicroverseAgentService(db)
    return await service.process_chat(request)


# ===== 角色管理接口 =====

@router.post("/characters", response_model=MicroverseCharacterResponse)
async def create_character(
    request: MicroverseCharacterCreate,
    db: AsyncSession = Depends(get_db)
):
    """创建角色"""
    service = MicroverseAgentService(db)
    character = await service.create_or_get_character(
        character_name=request.character_name,
        display_name=request.display_name,
        agent_id=request.agent_id,
        meta=request.meta
    )
    return character


@router.get("/characters", response_model=List[MicroverseCharacterResponse])
async def list_characters(db: AsyncSession = Depends(get_db)):
    """获取所有角色列表"""
    service = MicroverseAgentService(db)
    characters = await service.list_characters()
    return characters


@router.get("/characters/{character_name}", response_model=MicroverseCharacterDetailResponse)
async def get_character(
    character_name: str,
    db: AsyncSession = Depends(get_db)
):
    """获取角色详细信息"""
    service = MicroverseAgentService(db)
    return await service.get_character_info(character_name)


@router.put("/characters/{character_name}/bind", response_model=MicroverseCharacterResponse)
async def bind_character(
    character_name: str,
    request: MicroverseCharacterBindAgent,
    db: AsyncSession = Depends(get_db)
):
    """绑定或更换 Agent"""
    service = MicroverseAgentService(db)
    character = await service.bind_character_to_agent(
        character_name=character_name,
        agent_id=request.agent_id
    )
    return character


@router.delete("/characters/{character_name}/bind", response_model=Dict[str, bool])
async def unbind_character(
    character_name: str,
    db: AsyncSession = Depends(get_db)
):
    """解绑角色"""
    service = MicroverseAgentService(db)
    await service.unbind_character(character_name)
    return {"success": True}


# ===== 工作状态接口 =====

@router.post("/characters/{character_name}/work/start")
async def start_work(
    character_name: str,
    request: StartWorkRequest,
    db: AsyncSession = Depends(get_db)
):
    """启动角色工作（后台运行 Agent）"""
    service = MicroverseAgentService(db)
    return await service.start_character_work(
        character_name=character_name,
        task_description=request.task_description,
        project_path=request.project_path
    )


@router.post("/characters/{character_name}/work/stop")
async def stop_work(
    character_name: str,
    db: AsyncSession = Depends(get_db)
):
    """停止角色工作"""
    service = MicroverseAgentService(db)
    return await service.stop_character_work(character_name)


@router.get("/characters/{character_name}/work/status", response_model=WorkStatusResponse)
async def get_work_status(
    character_name: str,
    db: AsyncSession = Depends(get_db)
):
    """获取角色工作状态"""
    service = MicroverseAgentService(db)
    return await service.get_character_runtime_status(character_name)


@router.get("/characters/{character_name}/work/logs", response_model=WorkLogsResponse)
async def get_work_logs(
    character_name: str,
    offset: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """获取角色工作日志"""
    service = MicroverseAgentService(db)
    return await service.get_character_work_logs(
        character_name=character_name,
        offset=offset,
        limit=limit
    )


# ===== WebSocket 实时推送 =====

@router.websocket("/characters/{character_name}/work-ws")
async def character_work_websocket(
    websocket: WebSocket,
    character_name: str
):
    """
    WebSocket 端点：实时推送角色工作状态

    推送内容：
    - 任务状态变化（pending → running → succeeded/failed）
    - 执行进度（百分比）
    - 当前步骤描述
    - 日志输出（实时）
    """
    await websocket.accept()

    try:
        # 获取数据库会话
        async for db in get_db():
            service = MicroverseAgentService(db)

            # 检查角色是否存在
            character = await service.get_character(character_name)
            if not character:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Character {character_name} not found"
                })
                await websocket.close()
                return

            # 持续推送状态更新
            while True:
                try:
                    # 获取当前工作状态
                    status = await service.get_character_runtime_status(character_name)

                    # 推送状态更新
                    await websocket.send_json({
                        "type": "status_update",
                        "data": status
                    })

                    # 如果角色不在工作，降低推送频率
                    if status["status"] == "idle":
                        await asyncio.sleep(5)
                    else:
                        # 工作中，每秒推送一次
                        await asyncio.sleep(1)

                except WebSocketDisconnect:
                    break
                except Exception as e:
                    await websocket.send_json({
                        "type": "error",
                        "message": str(e)
                    })
                    await asyncio.sleep(1)

            break  # 退出数据库会话循环

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({
                "type": "error",
                "message": str(e)
            })
        except:
            pass
    finally:
        try:
            await websocket.close()
        except:
            pass


# ===== 任务配置接口 =====

class TaskConfigRequest(BaseModel):
    """任务配置请求"""
    description: str
    project_path: Optional[str] = None
    priority: int = 0
    auto_execute: bool = False


@router.post("/characters/{character_name}/tasks")
async def add_character_task(
    character_name: str,
    request: TaskConfigRequest,
    db: AsyncSession = Depends(get_db)
):
    """为角色添加任务配置"""
    service = MicroverseAgentService(db)
    return await service.add_character_task(
        character_name=character_name,
        description=request.description,
        project_path=request.project_path,
        priority=request.priority,
        auto_execute=request.auto_execute
    )


@router.get("/characters/{character_name}/tasks")
async def get_character_tasks(
    character_name: str,
    db: AsyncSession = Depends(get_db)
):
    """获取角色的任务配置列表"""
    service = MicroverseAgentService(db)
    return await service.get_character_tasks(character_name)


@router.delete("/characters/{character_name}/tasks/{task_id}")
async def delete_character_task(
    character_name: str,
    task_id: int,
    db: AsyncSession = Depends(get_db)
):
    """删除角色的任务配置"""
    service = MicroverseAgentService(db)
    return await service.delete_character_task(character_name, task_id)


# ===== 对话 API =====

@router.post("/conversations", response_model=ConversationResponse)
async def create_conversation(
    request: ConversationCreateRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    创建对话会话

    为指定角色创建一个新的对话会话，用于多轮对话。
    """
    service = MicroverseAgentService(db)
    return await service.create_conversation(
        character_name=request.character_name,
        context=request.context
    )


@router.post("/conversations/{session_id}/messages", response_model=MessageResponse)
async def send_message(
    session_id: str,
    request: MessageSendRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    发送消息到对话会话

    向指定的对话会话发送消息，并获取 Agent 的回复。
    """
    service = MicroverseAgentService(db)
    return await service.send_message(
        session_id=session_id,
        message=request.message,
        context=request.context
    )


@router.get("/conversations/{session_id}/history", response_model=ConversationHistoryResponse)
async def get_conversation_history(
    session_id: str,
    offset: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """
    获取对话历史

    获取指定会话的对话历史记录。
    """
    service = MicroverseAgentService(db)
    return await service.get_conversation_history(
        session_id=session_id,
        offset=offset,
        limit=limit
    )


# ===== 任务控制 API =====

@router.post("/executions/{execution_id}/pause", response_model=TaskControlResponse)
async def pause_execution(
    execution_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    暂停执行

    暂停正在运行的任务执行。
    """
    from app.repositories.executions_repo import ExecutionRepository
    from app.models.task import ExecutionStatus

    repo = ExecutionRepository(db)
    execution = await repo.get(execution_id)

    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")

    if execution.status != ExecutionStatus.RUNNING:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot pause execution with status: {execution.status}"
        )

    # TODO: 实现实际的暂停逻辑（需要与 Agent Runtime 集成）
    # 目前只更新状态
    execution.status = ExecutionStatus.PENDING
    await db.commit()

    return TaskControlResponse(
        success=True,
        execution_id=execution_id,
        status=execution.status.value,
        message="Execution paused successfully"
    )


@router.post("/executions/{execution_id}/resume", response_model=TaskControlResponse)
async def resume_execution(
    execution_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    恢复执行

    恢复已暂停的任务执行。
    """
    from app.repositories.executions_repo import ExecutionRepository
    from app.models.task import ExecutionStatus

    repo = ExecutionRepository(db)
    execution = await repo.get(execution_id)

    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")

    if execution.status != ExecutionStatus.PENDING:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot resume execution with status: {execution.status}"
        )

    # TODO: 实现实际的恢复逻辑（需要与 Agent Runtime 集成）
    execution.status = ExecutionStatus.RUNNING
    await db.commit()

    return TaskControlResponse(
        success=True,
        execution_id=execution_id,
        status=execution.status.value,
        message="Execution resumed successfully"
    )


@router.post("/executions/{execution_id}/stop", response_model=TaskControlResponse)
async def stop_execution(
    execution_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    停止执行

    停止正在运行的任务执行。
    """
    from app.repositories.executions_repo import ExecutionRepository
    from app.models.task import ExecutionStatus
    from datetime import datetime

    repo = ExecutionRepository(db)
    execution = await repo.get(execution_id)

    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")

    if execution.status not in [ExecutionStatus.RUNNING, ExecutionStatus.PENDING]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot stop execution with status: {execution.status}"
        )

    # TODO: 实现实际的停止逻辑（需要与 Agent Runtime 集成）
    # 如果有进程 PID，需要终止进程
    if execution.process_pid:
        try:
            import psutil
            process = psutil.Process(execution.process_pid)
            process.terminate()
            process.wait(timeout=5)
        except (psutil.NoSuchProcess, psutil.TimeoutExpired):
            pass

    execution.status = ExecutionStatus.CANCELLED
    execution.finished_at = datetime.utcnow()
    await db.commit()

    return TaskControlResponse(
        success=True,
        execution_id=execution_id,
        status=execution.status.value,
        message="Execution stopped successfully"
    )


@router.post("/executions/{execution_id}/retry", response_model=TaskControlResponse)
async def retry_execution(
    execution_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    重试执行

    重新执行失败的任务。
    """
    from app.repositories.executions_repo import ExecutionRepository
    from app.models.task import ExecutionStatus
    from datetime import datetime

    repo = ExecutionRepository(db)
    execution = await repo.get(execution_id)

    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")

    if execution.status not in [ExecutionStatus.FAILED, ExecutionStatus.CANCELLED]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot retry execution with status: {execution.status}"
        )

    # 创建新的执行记录
    new_execution = Execution(
        task_id=execution.task_id,
        workflow_id=execution.workflow_id,
        execution_type=execution.execution_type,
        agent_id=execution.agent_id,
        status=ExecutionStatus.PENDING,
        test_input=execution.test_input,
        session_id=execution.session_id,
        work_dir=execution.work_dir,
        started_at=datetime.utcnow()
    )

    db.add(new_execution)
    await db.commit()
    await db.refresh(new_execution)

    # TODO: 实际启动执行（需要与 Agent Runtime 集成）

    return TaskControlResponse(
        success=True,
        execution_id=new_execution.id,
        status=new_execution.status.value,
        message="Execution retry initiated"
    )


# ===== 询问响应 API =====

@router.post("/executions/{execution_id}/questions/{question_id}/answer", response_model=QuestionAnswerResponse)
async def answer_question(
    execution_id: int,
    question_id: str,
    request: QuestionAnswerRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    提交询问响应

    当 Agent 执行任务时需要用户输入，通过此接口提交答案。
    """
    from app.repositories.executions_repo import ExecutionRepository

    repo = ExecutionRepository(db)
    execution = await repo.get(execution_id)

    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")

    # TODO: 实现实际的询问响应逻辑
    # 需要将答案传递给正在运行的 Agent 进程
    # 可以通过 WebSocket 或其他 IPC 机制实现

    # 暂时存储在 meta 中
    if not execution.meta:
        execution.meta = {}

    if "questions" not in execution.meta:
        execution.meta["questions"] = {}

    execution.meta["questions"][question_id] = {
        "answer": request.answer,
        "answered_at": datetime.utcnow().isoformat()
    }

    await db.commit()

    return QuestionAnswerResponse(
        success=True,
        question_id=question_id,
        execution_id=execution_id
    )


# ===== 会话持久化 API =====

@router.post("/sessions/save", response_model=SessionSaveResponse)
async def save_session(
    request: SessionSaveRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    保存会话状态

    保存 Agent 会话的状态，用于跨设备同步或恢复中断的对话。
    """
    from app.repositories.executions_repo import ExecutionRepository
    from datetime import datetime

    repo = ExecutionRepository(db)
    execution = await repo.get_by_session_id(request.session_id)

    if not execution:
        raise HTTPException(status_code=404, detail="Session not found")

    # 保存会话数据到 meta
    if not execution.meta:
        execution.meta = {}

    execution.meta["saved_session"] = {
        "data": request.session_data,
        "saved_at": datetime.utcnow().isoformat()
    }

    await db.commit()

    return SessionSaveResponse(
        success=True,
        session_id=request.session_id,
        saved_at=datetime.utcnow()
    )


@router.post("/sessions/restore", response_model=SessionRestoreResponse)
async def restore_session(
    request: SessionRestoreRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    恢复会话状态

    恢复之前保存的 Agent 会话状态。
    """
    from app.repositories.executions_repo import ExecutionRepository
    from datetime import datetime

    repo = ExecutionRepository(db)
    execution = await repo.get_by_session_id(request.session_id)

    if not execution:
        raise HTTPException(status_code=404, detail="Session not found")

    # 从 meta 中恢复会话数据
    if not execution.meta or "saved_session" not in execution.meta:
        raise HTTPException(status_code=404, detail="No saved session data found")

    saved_session = execution.meta["saved_session"]

    return SessionRestoreResponse(
        success=True,
        session_id=request.session_id,
        session_data=saved_session["data"],
        saved_at=datetime.fromisoformat(saved_session["saved_at"])
    )



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
    WorkLogsResponse
)

router = APIRouter(prefix="/microverse", tags=["microverse"])

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



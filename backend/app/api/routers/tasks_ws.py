"""
Tasks WebSocket API Router
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Set
import asyncio
import json
from datetime import datetime

from app.core.database import get_db
from app.models.task import Task
from sqlalchemy import select

router = APIRouter()

# 存储活跃的 WebSocket 连接
active_connections: Dict[int, Set[WebSocket]] = {}


@router.websocket("/agents/{agent_id}/tasks-ws")
async def tasks_websocket(
    websocket: WebSocket,
    agent_id: int,
    db: AsyncSession = Depends(get_db)
):
    """WebSocket endpoint for real-time task updates"""
    await websocket.accept()

    # 注册连接
    if agent_id not in active_connections:
        active_connections[agent_id] = set()
    active_connections[agent_id].add(websocket)

    try:
        # 发送初始任务列表
        result = await db.execute(
            select(Task).where(Task.agent_id == agent_id)
        )
        tasks = result.scalars().all()

        await websocket.send_json({
            "type": "initial",
            "tasks": [task_to_dict(t) for t in tasks]
        })

        # 保持连接并监听消息
        while True:
            data = await websocket.receive_text()
            # 处理客户端消息（如果需要）
            try:
                message = json.loads(data)
                if message.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
            except json.JSONDecodeError:
                pass

    except WebSocketDisconnect:
        # 移除连接
        if agent_id in active_connections:
            active_connections[agent_id].discard(websocket)
            if not active_connections[agent_id]:
                del active_connections[agent_id]
    except Exception as e:
        print(f"[TasksWS] Error: {e}")
        if agent_id in active_connections:
            active_connections[agent_id].discard(websocket)


async def broadcast_task_update(agent_id: int, task: Task):
    """广播任务更新到所有连接的客户端"""
    if agent_id not in active_connections:
        return

    message = {
        "type": "task_update",
        "task": task_to_dict(task)
    }

    disconnected = set()
    for websocket in active_connections[agent_id]:
        try:
            await websocket.send_json(message)
        except Exception:
            disconnected.add(websocket)

    # 清理断开的连接
    active_connections[agent_id] -= disconnected
    if not active_connections[agent_id]:
        del active_connections[agent_id]


async def broadcast_task_delete(agent_id: int, task_id: int):
    """广播任务删除到所有连接的客户端"""
    if agent_id not in active_connections:
        return

    message = {
        "type": "task_delete",
        "task_id": task_id
    }

    disconnected = set()
    for websocket in active_connections[agent_id]:
        try:
            await websocket.send_json(message)
        except Exception:
            disconnected.add(websocket)

    # 清理断开的连接
    active_connections[agent_id] -= disconnected
    if not active_connections[agent_id]:
        del active_connections[agent_id]


def task_to_dict(task: Task) -> dict:
    """将 Task 对象转换为字典"""
    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "status": task.status.value if hasattr(task.status, 'value') else task.status,
        "agent_id": task.agent_id,
        "depends_on": task.depends_on or [],
        "blocks": task.blocks or [],
        "related_plan_ids": task.related_plan_ids or [],
        "related_progress_ids": task.related_progress_ids or [],
        "priority": task.priority,
        "created_at": task.created_at.isoformat() if task.created_at else None,
        "updated_at": task.updated_at.isoformat() if task.updated_at else None,
    }

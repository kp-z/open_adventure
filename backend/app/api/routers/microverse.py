"""
Microverse API Router
为 Microverse 游戏提供 Agent 对话接口
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional, Dict, Any

from app.core.database import get_db
from app.repositories.agent_repository import AgentRepository
from app.services.microverse_agent_service import MicroverseAgentService

router = APIRouter(prefix="/api/microverse", tags=["microverse"])

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

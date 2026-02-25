"""
Team Messages API Router - 团队消息 API 路由
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.message_service import MessageService, MessageType
from app.models.team_message import TeamMessage


router = APIRouter(prefix="/api/team-messages", tags=["team-messages"])
message_service = MessageService()


# Pydantic 模型
class SendMessageRequest(BaseModel):
    """发送消息请求"""
    team_id: int = Field(..., description="团队 ID")
    from_agent_id: int = Field(..., description="发送者 ID")
    to_agent_id: int = Field(..., description="接收者 ID")
    type: MessageType = Field(..., description="消息类型")
    content: dict = Field(..., description="消息内容")
    priority: int = Field(default=0, description="优先级")


class BroadcastMessageRequest(BaseModel):
    """广播消息请求"""
    team_id: int = Field(..., description="团队 ID")
    from_agent_id: int = Field(..., description="发送者 ID")
    agent_ids: List[int] = Field(..., description="接收者 ID 列表")
    type: MessageType = Field(..., description="消息类型")
    content: dict = Field(..., description="消息内容")
    priority: int = Field(default=0, description="优先级")


class MessageResponse(BaseModel):
    """消息响应"""
    id: int
    team_id: int
    from_agent_id: int
    to_agent_id: Optional[int]
    type: str
    content: dict
    priority: int
    read: bool
    created_at: str

    class Config:
        from_attributes = True


@router.post("", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    request: SendMessageRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    发送点对点消息

    Args:
        request: 发送消息请求
        db: 数据库会话

    Returns:
        MessageResponse: 创建的消息
    """
    try:
        message = await message_service.send_message(
            db=db,
            team_id=request.team_id,
            from_agent_id=request.from_agent_id,
            to_agent_id=request.to_agent_id,
            msg_type=request.type,
            content=request.content,
            priority=request.priority
        )

        return MessageResponse(
            id=message.id,
            team_id=message.team_id,
            from_agent_id=message.from_agent_id,
            to_agent_id=message.to_agent_id,
            type=message.type,
            content=message.content,
            priority=message.priority,
            read=message.read,
            created_at=message.created_at.isoformat()
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send message: {str(e)}"
        )


@router.post("/broadcast", response_model=List[MessageResponse], status_code=status.HTTP_201_CREATED)
async def broadcast_message(
    request: BroadcastMessageRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    广播消息到多个成员

    Args:
        request: 广播消息请求
        db: 数据库会话

    Returns:
        List[MessageResponse]: 创建的消息列表
    """
    try:
        messages = await message_service.broadcast_message(
            db=db,
            team_id=request.team_id,
            from_agent_id=request.from_agent_id,
            agent_ids=request.agent_ids,
            msg_type=request.type,
            content=request.content,
            priority=request.priority
        )

        return [
            MessageResponse(
                id=msg.id,
                team_id=msg.team_id,
                from_agent_id=msg.from_agent_id,
                to_agent_id=msg.to_agent_id,
                type=msg.type,
                content=msg.content,
                priority=msg.priority,
                read=msg.read,
                created_at=msg.created_at.isoformat()
            )
            for msg in messages
        ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to broadcast message: {str(e)}"
        )


@router.get("/{team_id}", response_model=List[MessageResponse])
async def get_message_history(
    team_id: int,
    agent_id: Optional[int] = None,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """
    获取消息历史

    Args:
        team_id: 团队 ID
        agent_id: 可选，指定成员 ID
        limit: 返回数量限制
        db: 数据库会话

    Returns:
        List[MessageResponse]: 消息列表
    """
    try:
        messages = await message_service.get_message_history(
            db=db,
            team_id=team_id,
            agent_id=agent_id,
            limit=limit
        )

        return [
            MessageResponse(
                id=msg.id,
                team_id=msg.team_id,
                from_agent_id=msg.from_agent_id,
                to_agent_id=msg.to_agent_id,
                type=msg.type,
                content=msg.content,
                priority=msg.priority,
                read=msg.read,
                created_at=msg.created_at.isoformat()
            )
            for msg in messages
        ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get message history: {str(e)}"
        )


@router.put("/{message_id}/read", response_model=MessageResponse)
async def mark_message_as_read(
    message_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    标记消息为已读

    Args:
        message_id: 消息 ID
        db: 数据库会话

    Returns:
        MessageResponse: 更新后的消息
    """
    message = await message_service.mark_as_read(db=db, message_id=message_id)

    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Message {message_id} not found"
        )

    return MessageResponse(
        id=message.id,
        team_id=message.team_id,
        from_agent_id=message.from_agent_id,
        to_agent_id=message.to_agent_id,
        type=message.type,
        content=message.content,
        priority=message.priority,
        read=message.read,
        created_at=message.created_at.isoformat()
    )

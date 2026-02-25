"""
Team State API Router - 团队状态 API 路由
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.team_state_manager import TeamStateManager, TeamStatus, MemberStatus


router = APIRouter(prefix="/api/team-state", tags=["team-state"])
state_manager = TeamStateManager()


# Pydantic 模型
class UpdateTeamStatusRequest(BaseModel):
    """更新团队状态请求"""
    status: TeamStatus = Field(..., description="团队状态")


class UpdateMemberStatusRequest(BaseModel):
    """更新成员状态请求"""
    status: MemberStatus = Field(..., description="成员状态")


class AssignTaskToMemberRequest(BaseModel):
    """分配任务给成员请求"""
    task_id: int = Field(..., description="任务 ID")


class TeamStateResponse(BaseModel):
    """团队状态响应"""
    id: int
    team_id: int
    status: str
    member_states: dict
    current_tasks: dict
    updated_at: str

    class Config:
        from_attributes = True


@router.get("/{team_id}", response_model=TeamStateResponse)
async def get_team_state(
    team_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    获取团队状态

    Args:
        team_id: 团队 ID
        db: 数据库会话

    Returns:
        TeamStateResponse: 团队状态
    """
    try:
        state = await state_manager.get_team_state(db=db, team_id=team_id)

        if not state:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Team state for team {team_id} not found"
            )

        return TeamStateResponse(
            id=state.id,
            team_id=state.team_id,
            status=state.status,
            member_states=state.member_states,
            current_tasks=state.current_tasks,
            updated_at=state.updated_at.isoformat()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get team state: {str(e)}"
        )


@router.put("/{team_id}/status", response_model=TeamStateResponse)
async def update_team_status(
    team_id: int,
    request: UpdateTeamStatusRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    更新团队状态

    Args:
        team_id: 团队 ID
        request: 更新团队状态请求
        db: 数据库会话

    Returns:
        TeamStateResponse: 更新后的团队状态
    """
    try:
        state = await state_manager.update_team_status(
            db=db,
            team_id=team_id,
            status=request.status
        )

        return TeamStateResponse(
            id=state.id,
            team_id=state.team_id,
            status=state.status,
            member_states=state.member_states,
            current_tasks=state.current_tasks,
            updated_at=state.updated_at.isoformat()
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update team status: {str(e)}"
        )


@router.put("/{team_id}/member/{agent_id}", response_model=TeamStateResponse)
async def update_member_status(
    team_id: int,
    agent_id: int,
    request: UpdateMemberStatusRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    更新成员状态

    Args:
        team_id: 团队 ID
        agent_id: Agent ID
        request: 更新成员状态请求
        db: 数据库会话

    Returns:
        TeamStateResponse: 更新后的团队状态
    """
    try:
        state = await state_manager.update_member_status(
            db=db,
            team_id=team_id,
            agent_id=agent_id,
            status=request.status
        )

        return TeamStateResponse(
            id=state.id,
            team_id=state.team_id,
            status=state.status,
            member_states=state.member_states,
            current_tasks=state.current_tasks,
            updated_at=state.updated_at.isoformat()
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update member status: {str(e)}"
        )


@router.post("/{team_id}/member/{agent_id}/assign-task", response_model=TeamStateResponse)
async def assign_task_to_member(
    team_id: int,
    agent_id: int,
    request: AssignTaskToMemberRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    分配任务给成员

    Args:
        team_id: 团队 ID
        agent_id: Agent ID
        request: 分配任务请求
        db: 数据库会话

    Returns:
        TeamStateResponse: 更新后的团队状态
    """
    try:
        state = await state_manager.assign_task_to_member(
            db=db,
            team_id=team_id,
            agent_id=agent_id,
            task_id=request.task_id
        )

        return TeamStateResponse(
            id=state.id,
            team_id=state.team_id,
            status=state.status,
            member_states=state.member_states,
            current_tasks=state.current_tasks,
            updated_at=state.updated_at.isoformat()
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to assign task to member: {str(e)}"
        )


@router.post("/{team_id}/member/{agent_id}/complete-task", response_model=TeamStateResponse)
async def complete_member_task(
    team_id: int,
    agent_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    完成成员的当前任务

    Args:
        team_id: 团队 ID
        agent_id: Agent ID
        db: 数据库会话

    Returns:
        TeamStateResponse: 更新后的团队状态
    """
    try:
        state = await state_manager.complete_member_task(
            db=db,
            team_id=team_id,
            agent_id=agent_id
        )

        return TeamStateResponse(
            id=state.id,
            team_id=state.team_id,
            status=state.status,
            member_states=state.member_states,
            current_tasks=state.current_tasks,
            updated_at=state.updated_at.isoformat()
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to complete member task: {str(e)}"
        )

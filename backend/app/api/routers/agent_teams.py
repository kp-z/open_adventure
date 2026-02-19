"""
AgentTeam API Router
"""
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.repositories.agent_team_repository import AgentTeamRepository
from app.services.agent_team_service import AgentTeamService
from app.schemas.agent_team import AgentTeamCreate, AgentTeamUpdate, AgentTeamResponse, AgentTeamListResponse

router = APIRouter(prefix="/agent-teams", tags=["agent-teams"])


def get_agent_team_service(db: AsyncSession = Depends(get_db)) -> AgentTeamService:
    """Dependency to get agent team service"""
    repository = AgentTeamRepository(db)
    return AgentTeamService(repository)


@router.post(
    "",
    response_model=AgentTeamResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new agent team"
)
async def create_agent_team(
    team_data: AgentTeamCreate,
    service: AgentTeamService = Depends(get_agent_team_service)
):
    """Create a new agent team"""
    return await service.create_team(team_data)


@router.get(
    "",
    response_model=AgentTeamListResponse,
    summary="List all agent teams"
)
async def list_agent_teams(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of items to return"),
    service: AgentTeamService = Depends(get_agent_team_service)
):
    """List all agent teams with pagination"""
    return await service.list_teams(skip=skip, limit=limit)


@router.get(
    "/search",
    response_model=AgentTeamListResponse,
    summary="Search agent teams"
)
async def search_agent_teams(
    q: str = Query(..., min_length=1, description="Search query"),
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of items to return"),
    service: AgentTeamService = Depends(get_agent_team_service)
):
    """Search agent teams by name or description"""
    return await service.search_teams(query=q, skip=skip, limit=limit)


@router.get(
    "/{team_id}",
    response_model=AgentTeamResponse,
    summary="Get agent team by ID"
)
async def get_agent_team(
    team_id: int,
    service: AgentTeamService = Depends(get_agent_team_service)
):
    """Get an agent team by ID"""
    return await service.get_team(team_id)


@router.put(
    "/{team_id}",
    response_model=AgentTeamResponse,
    summary="Update an agent team"
)
async def update_agent_team(
    team_id: int,
    team_data: AgentTeamUpdate,
    service: AgentTeamService = Depends(get_agent_team_service)
):
    """Update an agent team"""
    return await service.update_team(team_id, team_data)


@router.delete(
    "/{team_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an agent team"
)
async def delete_agent_team(
    team_id: int,
    service: AgentTeamService = Depends(get_agent_team_service)
):
    """Delete an agent team"""
    await service.delete_team(team_id)

"""
Agent API Router
"""
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.repositories.agent_repository import AgentRepository
from app.services.agent_service import AgentService
from app.schemas.agent import AgentCreate, AgentUpdate, AgentResponse, AgentListResponse

router = APIRouter(prefix="/agents", tags=["agents"])


def get_agent_service(db: AsyncSession = Depends(get_db)) -> AgentService:
    """Dependency to get agent service"""
    repository = AgentRepository(db)
    return AgentService(repository)


@router.post(
    "",
    response_model=AgentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new agent"
)
async def create_agent(
    agent_data: AgentCreate,
    service: AgentService = Depends(get_agent_service)
):
    """Create a new agent"""
    return await service.create_agent(agent_data)


@router.get(
    "",
    response_model=AgentListResponse,
    summary="List all agents"
)
async def list_agents(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of items to return"),
    service: AgentService = Depends(get_agent_service)
):
    """List all agents with pagination"""
    return await service.list_agents(skip=skip, limit=limit)


@router.get(
    "/search",
    response_model=AgentListResponse,
    summary="Search agents"
)
async def search_agents(
    q: str = Query(..., min_length=1, description="Search query"),
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of items to return"),
    service: AgentService = Depends(get_agent_service)
):
    """Search agents by name or description"""
    return await service.search_agents(query=q, skip=skip, limit=limit)


@router.get(
    "/{agent_id}",
    response_model=AgentResponse,
    summary="Get agent by ID"
)
async def get_agent(
    agent_id: int,
    service: AgentService = Depends(get_agent_service)
):
    """Get an agent by ID"""
    return await service.get_agent(agent_id)


@router.put(
    "/{agent_id}",
    response_model=AgentResponse,
    summary="Update an agent"
)
async def update_agent(
    agent_id: int,
    agent_data: AgentUpdate,
    service: AgentService = Depends(get_agent_service)
):
    """Update an agent"""
    return await service.update_agent(agent_id, agent_data)


@router.delete(
    "/{agent_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an agent"
)
async def delete_agent(
    agent_id: int,
    service: AgentService = Depends(get_agent_service)
):
    """Delete an agent"""
    await service.delete_agent(agent_id)

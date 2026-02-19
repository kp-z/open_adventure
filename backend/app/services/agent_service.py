"""
Agent Service
"""
from app.repositories.agent_repository import AgentRepository
from app.schemas.agent import AgentCreate, AgentUpdate, AgentResponse, AgentListResponse
from app.core.exceptions import NotFoundException, ConflictException


class AgentService:
    """Service for agent business logic"""

    def __init__(self, repository: AgentRepository):
        self.repository = repository

    async def create_agent(self, agent_data: AgentCreate) -> AgentResponse:
        """Create a new agent"""
        # Check if agent with same name already exists
        existing = await self.repository.get_by_name(agent_data.name)
        if existing:
            raise ConflictException(f"Agent with name '{agent_data.name}' already exists")

        agent = await self.repository.create(agent_data)
        return AgentResponse.model_validate(agent)

    async def get_agent(self, agent_id: int) -> AgentResponse:
        """Get agent by ID"""
        agent = await self.repository.get_by_id(agent_id)
        if not agent:
            raise NotFoundException(f"Agent with id {agent_id} not found")
        return AgentResponse.model_validate(agent)

    async def get_agent_by_name(self, name: str) -> AgentResponse:
        """Get agent by name"""
        agent = await self.repository.get_by_name(name)
        if not agent:
            raise NotFoundException(f"Agent with name '{name}' not found")
        return AgentResponse.model_validate(agent)

    async def list_agents(
        self,
        skip: int = 0,
        limit: int = 100
    ) -> AgentListResponse:
        """List all agents with pagination"""
        agents, total = await self.repository.get_all(skip=skip, limit=limit)
        return AgentListResponse(
            total=total,
            items=[AgentResponse.model_validate(agent) for agent in agents]
        )

    async def update_agent(self, agent_id: int, agent_data: AgentUpdate) -> AgentResponse:
        """Update an agent"""
        # If name is being updated, check for conflicts
        if agent_data.name:
            existing = await self.repository.get_by_name(agent_data.name)
            if existing and existing.id != agent_id:
                raise ConflictException(f"Agent with name '{agent_data.name}' already exists")

        agent = await self.repository.update(agent_id, agent_data)
        if not agent:
            raise NotFoundException(f"Agent with id {agent_id} not found")
        return AgentResponse.model_validate(agent)

    async def delete_agent(self, agent_id: int) -> None:
        """Delete an agent"""
        success = await self.repository.delete(agent_id)
        if not success:
            raise NotFoundException(f"Agent with id {agent_id} not found")

    async def search_agents(
        self,
        query: str,
        skip: int = 0,
        limit: int = 100
    ) -> AgentListResponse:
        """Search agents by name or description"""
        agents, total = await self.repository.search(query, skip=skip, limit=limit)
        return AgentListResponse(
            total=total,
            items=[AgentResponse.model_validate(agent) for agent in agents]
        )

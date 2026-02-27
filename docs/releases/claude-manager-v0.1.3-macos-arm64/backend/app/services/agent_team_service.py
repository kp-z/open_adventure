"""
AgentTeam Service
"""
from app.repositories.agent_team_repository import AgentTeamRepository
from app.schemas.agent_team import AgentTeamCreate, AgentTeamUpdate, AgentTeamResponse, AgentTeamListResponse
from app.core.exceptions import NotFoundException, ConflictException


class AgentTeamService:
    """Service for agent team business logic"""

    def __init__(self, repository: AgentTeamRepository):
        self.repository = repository

    async def create_team(self, team_data: AgentTeamCreate) -> AgentTeamResponse:
        """Create a new agent team"""
        # Check if team with same name already exists
        existing = await self.repository.get_by_name(team_data.name)
        if existing:
            raise ConflictException(f"Agent team with name '{team_data.name}' already exists")

        team = await self.repository.create(team_data)
        return AgentTeamResponse.model_validate(team)

    async def get_team(self, team_id: int) -> AgentTeamResponse:
        """Get agent team by ID"""
        team = await self.repository.get_by_id(team_id)
        if not team:
            raise NotFoundException(f"Agent team with id {team_id} not found")
        return AgentTeamResponse.model_validate(team)

    async def get_team_by_name(self, name: str) -> AgentTeamResponse:
        """Get agent team by name"""
        team = await self.repository.get_by_name(name)
        if not team:
            raise NotFoundException(f"Agent team with name '{name}' not found")
        return AgentTeamResponse.model_validate(team)

    async def list_teams(
        self,
        skip: int = 0,
        limit: int = 100
    ) -> AgentTeamListResponse:
        """List all agent teams with pagination"""
        teams, total = await self.repository.get_all(skip=skip, limit=limit)
        return AgentTeamListResponse(
            total=total,
            items=[AgentTeamResponse.model_validate(team) for team in teams]
        )

    async def update_team(self, team_id: int, team_data: AgentTeamUpdate) -> AgentTeamResponse:
        """Update an agent team"""
        # If name is being updated, check for conflicts
        if team_data.name:
            existing = await self.repository.get_by_name(team_data.name)
            if existing and existing.id != team_id:
                raise ConflictException(f"Agent team with name '{team_data.name}' already exists")

        team = await self.repository.update(team_id, team_data)
        if not team:
            raise NotFoundException(f"Agent team with id {team_id} not found")
        return AgentTeamResponse.model_validate(team)

    async def delete_team(self, team_id: int) -> None:
        """Delete an agent team"""
        success = await self.repository.delete(team_id)
        if not success:
            raise NotFoundException(f"Agent team with id {team_id} not found")

    async def search_teams(
        self,
        query: str,
        skip: int = 0,
        limit: int = 100
    ) -> AgentTeamListResponse:
        """Search agent teams by name or description"""
        teams, total = await self.repository.search(query, skip=skip, limit=limit)
        return AgentTeamListResponse(
            total=total,
            items=[AgentTeamResponse.model_validate(team) for team in teams]
        )

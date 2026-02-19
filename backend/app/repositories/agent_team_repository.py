"""
AgentTeam Repository
"""
from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent_team import AgentTeam
from app.schemas.agent_team import AgentTeamCreate, AgentTeamUpdate


class AgentTeamRepository:
    """Repository for AgentTeam CRUD operations"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, team_data: AgentTeamCreate) -> AgentTeam:
        """Create a new agent team"""
        # Convert members to dict for JSON storage
        team_dict = team_data.model_dump()
        team_dict['members'] = [member.model_dump() for member in team_data.members]

        team = AgentTeam(**team_dict)
        self.session.add(team)
        await self.session.commit()
        await self.session.refresh(team)
        return team

    async def get_by_id(self, team_id: int) -> Optional[AgentTeam]:
        """Get agent team by ID"""
        result = await self.session.execute(
            select(AgentTeam).where(AgentTeam.id == team_id)
        )
        return result.scalar_one_or_none()

    async def get_by_name(self, name: str) -> Optional[AgentTeam]:
        """Get agent team by name"""
        result = await self.session.execute(
            select(AgentTeam).where(AgentTeam.name == name)
        )
        return result.scalar_one_or_none()

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100
    ) -> tuple[list[AgentTeam], int]:
        """Get all agent teams with pagination"""
        query = select(AgentTeam)

        # Get total count
        count_query = select(func.count()).select_from(AgentTeam)
        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()

        # Apply pagination
        query = query.offset(skip).limit(limit).order_by(AgentTeam.id)

        result = await self.session.execute(query)
        teams = list(result.scalars().all())

        return teams, total

    async def update(self, team_id: int, team_data: AgentTeamUpdate) -> Optional[AgentTeam]:
        """Update an agent team"""
        team = await self.get_by_id(team_id)
        if not team:
            return None

        update_data = team_data.model_dump(exclude_unset=True)

        # Convert members to dict if present
        if 'members' in update_data and update_data['members'] is not None:
            update_data['members'] = [member.model_dump() for member in team_data.members]

        for field, value in update_data.items():
            setattr(team, field, value)

        await self.session.commit()
        await self.session.refresh(team)
        return team

    async def delete(self, team_id: int) -> bool:
        """Delete an agent team"""
        team = await self.get_by_id(team_id)
        if not team:
            return False

        await self.session.delete(team)
        await self.session.commit()
        return True

    async def search(
        self,
        query: str,
        skip: int = 0,
        limit: int = 100
    ) -> tuple[list[AgentTeam], int]:
        """Search agent teams by name or description"""
        search_query = select(AgentTeam).where(
            (AgentTeam.name.ilike(f"%{query}%")) |
            (AgentTeam.description.ilike(f"%{query}%"))
        )

        # Get total count
        count_query = select(func.count()).select_from(search_query.subquery())
        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()

        # Apply pagination
        search_query = search_query.offset(skip).limit(limit).order_by(AgentTeam.id)

        result = await self.session.execute(search_query)
        teams = list(result.scalars().all())

        return teams, total

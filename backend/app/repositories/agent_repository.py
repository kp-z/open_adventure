"""
Agent Repository
"""
from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import Agent
from app.schemas.agent import AgentCreate, AgentUpdate


class AgentRepository:
    """Repository for Agent CRUD operations"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, agent_data: AgentCreate) -> Agent:
        """Create a new agent"""
        agent = Agent(**agent_data.model_dump())
        self.session.add(agent)
        await self.session.commit()
        await self.session.refresh(agent)
        return agent

    async def get_by_id(self, agent_id: int) -> Optional[Agent]:
        """Get agent by ID"""
        result = await self.session.execute(
            select(Agent).where(Agent.id == agent_id)
        )
        return result.scalar_one_or_none()

    async def get_by_name(self, name: str) -> Optional[Agent]:
        """Get agent by name"""
        result = await self.session.execute(
            select(Agent).where(Agent.name == name)
        )
        return result.scalar_one_or_none()

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100
    ) -> tuple[list[Agent], int]:
        """Get all agents with pagination"""
        query = select(Agent)

        # Get total count
        count_query = select(func.count()).select_from(Agent)
        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()

        # Apply pagination
        query = query.offset(skip).limit(limit).order_by(Agent.id)

        result = await self.session.execute(query)
        agents = list(result.scalars().all())

        return agents, total

    async def update(self, agent_id: int, agent_data: AgentUpdate) -> Optional[Agent]:
        """Update an agent"""
        agent = await self.get_by_id(agent_id)
        if not agent:
            return None

        update_data = agent_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(agent, field, value)

        await self.session.commit()
        await self.session.refresh(agent)
        return agent

    async def delete(self, agent_id: int) -> bool:
        """Delete an agent"""
        agent = await self.get_by_id(agent_id)
        if not agent:
            return False

        await self.session.delete(agent)
        await self.session.commit()
        return True

    async def search(
        self,
        query: str,
        skip: int = 0,
        limit: int = 100
    ) -> tuple[list[Agent], int]:
        """Search agents by name or description"""
        search_query = select(Agent).where(
            (Agent.name.ilike(f"%{query}%")) |
            (Agent.description.ilike(f"%{query}%"))
        )

        # Get total count
        count_query = select(func.count()).select_from(search_query.subquery())
        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()

        # Apply pagination
        search_query = search_query.offset(skip).limit(limit).order_by(Agent.id)

        result = await self.session.execute(search_query)
        agents = list(result.scalars().all())

        return agents, total

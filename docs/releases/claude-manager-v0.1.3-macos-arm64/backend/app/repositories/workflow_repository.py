"""
Workflow Repository
"""
from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.workflow import Workflow, WorkflowNode, WorkflowEdge
from app.schemas.workflow import WorkflowCreate, WorkflowUpdate


class WorkflowRepository:
    """Repository for Workflow CRUD operations"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, workflow_data: WorkflowCreate) -> Workflow:
        """Create a new workflow with nodes and edges"""
        # Create workflow
        workflow_dict = workflow_data.model_dump(exclude={'nodes', 'edges'})
        workflow = Workflow(**workflow_dict)
        self.session.add(workflow)
        await self.session.flush()

        # Create nodes
        for node_data in workflow_data.nodes:
            node = WorkflowNode(
                workflow_id=workflow.id,
                **node_data.model_dump()
            )
            self.session.add(node)

        await self.session.flush()

        # Create edges
        for edge_data in workflow_data.edges:
            edge = WorkflowEdge(
                workflow_id=workflow.id,
                **edge_data.model_dump()
            )
            self.session.add(edge)

        await self.session.commit()
        await self.session.refresh(workflow)

        # Load relationships
        result = await self.session.execute(
            select(Workflow)
            .options(selectinload(Workflow.nodes), selectinload(Workflow.edges))
            .where(Workflow.id == workflow.id)
        )
        return result.scalar_one()

    async def get_by_id(self, workflow_id: int) -> Optional[Workflow]:
        """Get workflow by ID with nodes and edges"""
        result = await self.session.execute(
            select(Workflow)
            .options(selectinload(Workflow.nodes), selectinload(Workflow.edges))
            .where(Workflow.id == workflow_id)
        )
        return result.scalar_one_or_none()

    async def get_by_name(self, name: str) -> Optional[Workflow]:
        """Get workflow by name"""
        result = await self.session.execute(
            select(Workflow)
            .options(selectinload(Workflow.nodes), selectinload(Workflow.edges))
            .where(Workflow.name == name)
        )
        return result.scalar_one_or_none()

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        active: Optional[bool] = None
    ) -> tuple[list[Workflow], int]:
        """Get all workflows with pagination"""
        query = select(Workflow).options(
            selectinload(Workflow.nodes),
            selectinload(Workflow.edges)
        )

        # Apply filters
        if active is not None:
            query = query.where(Workflow.active == active)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()

        # Apply pagination
        query = query.offset(skip).limit(limit).order_by(Workflow.id)

        result = await self.session.execute(query)
        workflows = list(result.scalars().all())

        return workflows, total

    async def update(self, workflow_id: int, workflow_data: WorkflowUpdate) -> Optional[Workflow]:
        """Update a workflow"""
        workflow = await self.get_by_id(workflow_id)
        if not workflow:
            return None

        update_data = workflow_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(workflow, field, value)

        await self.session.commit()
        await self.session.refresh(workflow)
        return workflow

    async def delete(self, workflow_id: int) -> bool:
        """Delete a workflow"""
        workflow = await self.get_by_id(workflow_id)
        if not workflow:
            return False

        await self.session.delete(workflow)
        await self.session.commit()
        return True

    async def search(
        self,
        query: str,
        skip: int = 0,
        limit: int = 100
    ) -> tuple[list[Workflow], int]:
        """Search workflows by name or description"""
        search_query = select(Workflow).options(
            selectinload(Workflow.nodes),
            selectinload(Workflow.edges)
        ).where(
            (Workflow.name.ilike(f"%{query}%")) |
            (Workflow.description.ilike(f"%{query}%"))
        )

        # Get total count
        count_query = select(func.count()).select_from(search_query.subquery())
        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()

        # Apply pagination
        search_query = search_query.offset(skip).limit(limit).order_by(Workflow.id)

        result = await self.session.execute(search_query)
        workflows = list(result.scalars().all())

        return workflows, total

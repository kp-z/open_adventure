"""
Skill API Router
"""
import subprocess
import json
from typing import Optional
from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.database import get_db
from app.repositories.skill_repository import SkillRepository
from app.services.skill_service import SkillService
from app.schemas.skill import SkillCreate, SkillUpdate, SkillResponse, SkillListResponse
from app.models.skill import SkillSource

router = APIRouter(prefix="/skills", tags=["skills"])


class SkillGenerateRequest(BaseModel):
    """Request schema for generating a skill from natural language"""
    description: str
    name: Optional[str] = None


class SkillGenerateResponse(BaseModel):
    """Response schema for skill generation"""
    skill: SkillCreate
    message: str


def get_skill_service(db: AsyncSession = Depends(get_db)) -> SkillService:
    """Dependency to get skill service"""
    repository = SkillRepository(db)
    return SkillService(repository)


@router.post(
    "",
    response_model=SkillResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new skill"
)
async def create_skill(
    skill_data: SkillCreate,
    service: SkillService = Depends(get_skill_service)
):
    """Create a new skill"""
    return await service.create_skill(skill_data)


@router.get(
    "",
    response_model=SkillListResponse,
    summary="List all skills"
)
async def list_skills(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of items to return"),
    source: Optional[SkillSource] = Query(None, description="Filter by source"),
    enabled: Optional[bool] = Query(None, description="Filter by enabled status"),
    service: SkillService = Depends(get_skill_service)
):
    """List all skills with pagination and filters"""
    return await service.list_skills(skip=skip, limit=limit, source=source, enabled=enabled)


@router.get(
    "/search",
    response_model=SkillListResponse,
    summary="Search skills"
)
async def search_skills(
    q: str = Query(..., min_length=1, description="Search query"),
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of items to return"),
    service: SkillService = Depends(get_skill_service)
):
    """Search skills by name or description"""
    return await service.search_skills(query=q, skip=skip, limit=limit)


@router.post(
    "/generate",
    response_model=SkillGenerateResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate a skill from natural language description"
)
async def generate_skill(
    request: SkillGenerateRequest,
    service: SkillService = Depends(get_skill_service)
):
    """
    Generate a complete skill definition from natural language description.
    Uses AI to generate the skill structure based on the description.
    """
    try:
        # Generate skill name from description if not provided
        if not request.name:
            # Create a simple name from description (first few words, kebab-case)
            words = request.description.lower().split()[:3]
            generated_name = "-".join(w for w in words if w.isalnum())
        else:
            generated_name = request.name

        # Generate full name (title case)
        full_name = " ".join(word.capitalize() for word in generated_name.split("-"))

        # Determine skill type based on keywords in description
        description_lower = request.description.lower()
        if any(word in description_lower for word in ["analyze", "check", "inspect", "review"]):
            skill_type = "analysis"
        elif any(word in description_lower for word in ["format", "convert", "transform"]):
            skill_type = "utility"
        elif any(word in description_lower for word in ["generate", "create", "build"]):
            skill_type = "generator"
        elif any(word in description_lower for word in ["test", "validate"]):
            skill_type = "testing"
        else:
            skill_type = "utility"

        # Extract potential tags from description
        common_tags = ["python", "javascript", "typescript", "json", "yaml", "git",
                      "docker", "api", "database", "security", "performance"]
        tags = [tag for tag in common_tags if tag in description_lower]

        # Create basic skill structure
        skill_create = SkillCreate(
            name=generated_name,
            full_name=full_name,
            type=skill_type,
            description=request.description,
            tags=tags[:5],  # Limit to 5 tags
            source=SkillSource.PROJECT,
            enabled=True,
            references=None,
            scripts=None
        )

        return SkillGenerateResponse(
            skill=skill_create,
            message="Skill template generated successfully. You can customize it before creating."
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate skill: {str(e)}"
        )


@router.get(
    "/{skill_id}",
    response_model=SkillResponse,
    summary="Get skill by ID"
)
async def get_skill(
    skill_id: int,
    service: SkillService = Depends(get_skill_service)
):
    """Get a skill by ID"""
    return await service.get_skill(skill_id)


@router.put(
    "/{skill_id}",
    response_model=SkillResponse,
    summary="Update a skill"
)
async def update_skill(
    skill_id: int,
    skill_data: SkillUpdate,
    service: SkillService = Depends(get_skill_service)
):
    """Update a skill"""
    return await service.update_skill(skill_id, skill_data)


@router.delete(
    "/{skill_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a skill"
)
async def delete_skill(
    skill_id: int,
    service: SkillService = Depends(get_skill_service)
):
    """Delete a skill"""
    await service.delete_skill(skill_id)

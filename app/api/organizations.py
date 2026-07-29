"""
PayParity — Organizations API
Workspace management.
"""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user, require_admin, CurrentUser
from app.database import get_db
from app.models.organization import Organization

router = APIRouter()


class OrgCreate(BaseModel):
    name: str
    slug: str
    industry: Optional[str] = None
    country: Optional[str] = None
    privacy_epsilon_budget: float = 10.0


class OrgResponse(BaseModel):
    id: str
    name: str
    slug: str
    industry: Optional[str]
    country: Optional[str]
    privacy_epsilon_budget: float
    is_active: bool

    class Config:
        from_attributes = True


@router.post("/", response_model=OrgResponse, status_code=201)
async def create_organization(
    body: OrgCreate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin),
):
    """Create a new organization workspace. Admin only."""
    existing = await db.execute(select(Organization).where(Organization.slug == body.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Slug already taken")

    org = Organization(**body.model_dump())
    db.add(org)
    await db.flush()
    return OrgResponse(
        id=str(org.id),
        name=org.name,
        slug=org.slug,
        industry=org.industry,
        country=org.country,
        privacy_epsilon_budget=org.privacy_epsilon_budget,
        is_active=org.is_active,
    )


@router.get("/{org_id}", response_model=OrgResponse)
async def get_organization(
    org_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get organization details (must be a member)."""
    if current_user.org_id != org_id:
        raise HTTPException(status_code=403, detail="Access denied")
    org = await db.get(Organization, uuid.UUID(org_id))
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return OrgResponse(
        id=str(org.id), name=org.name, slug=org.slug,
        industry=org.industry, country=org.country,
        privacy_epsilon_budget=org.privacy_epsilon_budget, is_active=org.is_active,
    )

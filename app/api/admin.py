"""PayParity — Admin Configuration API"""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_admin, CurrentUser
from app.database import get_db
from app.models.organization import Organization
from app.config import settings

router = APIRouter()


class GuardrailsConfig(BaseModel):
    max_epsilon_per_audit: float = 1.0
    require_hitl_for_all_recommendations: bool = True
    min_sample_size_for_analysis: int = 30
    anonymization_strictness: str = "high"  # "standard" or "high"


@router.put("/guardrails")
async def update_guardrails(
    body: GuardrailsConfig,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin),
):
    """Update guardrails configuration for the organization. Admin only."""
    org = await db.get(Organization, uuid.UUID(current_user.org_id))
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    if body.max_epsilon_per_audit > settings.MAX_PRIVACY_EPSILON:
        raise HTTPException(
            status_code=422,
            detail=f"max_epsilon_per_audit cannot exceed system limit of {settings.MAX_PRIVACY_EPSILON}"
        )

    org.guardrails_config = body.model_dump()
    await db.flush()

    return {"status": "updated", "guardrails": body.model_dump()}


@router.get("/guardrails")
async def get_guardrails(
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin),
):
    """Get current guardrails configuration."""
    org = await db.get(Organization, uuid.UUID(current_user.org_id))
    return org.guardrails_config or GuardrailsConfig().model_dump()

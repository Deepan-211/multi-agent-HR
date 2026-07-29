"""PayParity — Counterfactuals API"""
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user, CurrentUser
from app.database import get_db
from app.models.counterfactual import CounterfactualExperiment
from app.models.audit import Audit

router = APIRouter()


class CounterfactualResponse(BaseModel):
    id: str
    audit_id: str
    attribute_swapped: str
    from_group: str
    to_group: str
    sample_size: int
    rating_delta: Optional[float]
    effect_size_cohens_d: Optional[float]
    p_value: Optional[float]
    is_statistically_significant: Optional[bool]
    interpretation: Optional[str]
    dp_epsilon_used: Optional[float]


@router.get("/audit/{audit_id}", response_model=List[CounterfactualResponse])
async def get_counterfactuals(
    audit_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    audit = await db.get(Audit, uuid.UUID(audit_id))
    if not audit or str(audit.organization_id) != current_user.org_id:
        raise HTTPException(status_code=404, detail="Audit not found")

    result = await db.execute(
        select(CounterfactualExperiment).where(
            CounterfactualExperiment.audit_id == uuid.UUID(audit_id)
        )
    )
    experiments = result.scalars().all()

    return [
        CounterfactualResponse(
            id=str(e.id), audit_id=str(e.audit_id),
            attribute_swapped=e.attribute_swapped,
            from_group=e.from_group, to_group=e.to_group,
            sample_size=e.sample_size,
            rating_delta=e.rating_delta,
            effect_size_cohens_d=e.effect_size_cohens_d,
            p_value=e.p_value,
            is_statistically_significant=e.is_statistically_significant,
            interpretation=e.interpretation,
            dp_epsilon_used=e.dp_epsilon_used,
        )
        for e in experiments
    ]

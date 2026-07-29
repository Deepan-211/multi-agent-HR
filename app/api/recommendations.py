"""PayParity — Equity Recommendations API"""
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user, CurrentUser
from app.database import get_db
from app.models.equity_recommendation import EquityRecommendation
from app.models.audit import Audit

router = APIRouter()


class RecommendationResponse(BaseModel):
    id: str
    audit_id: str
    status: str
    target_scope: str
    affected_group: Optional[str]
    affected_employee_count_dp: Optional[int]
    identified_gap_pct: Optional[float]
    recommended_adjustment_pct: Optional[float]
    recommended_adjustment_total_usd: Optional[float]
    budget_constraint_usd: Optional[float]
    is_within_budget: bool
    priority_score: Optional[float]
    expected_gap_reduction_pct: Optional[float]
    action_plan: Optional[dict]
    hitl_required: bool
    finalized_at: Optional[str]


@router.get("/audit/{audit_id}", response_model=List[RecommendationResponse])
async def get_recommendations(
    audit_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get equity recommendations for an audit."""
    audit = await db.get(Audit, uuid.UUID(audit_id))
    if not audit or str(audit.organization_id) != current_user.org_id:
        raise HTTPException(status_code=404, detail="Audit not found")

    result = await db.execute(
        select(EquityRecommendation)
        .where(EquityRecommendation.audit_id == uuid.UUID(audit_id))
        .order_by(EquityRecommendation.priority_score.desc())
    )
    recs = result.scalars().all()

    return [
        RecommendationResponse(
            id=str(r.id), audit_id=str(r.audit_id), status=r.status.value,
            target_scope=r.target_scope, affected_group=r.affected_group,
            affected_employee_count_dp=r.affected_employee_count_dp,
            identified_gap_pct=r.identified_gap_pct,
            recommended_adjustment_pct=r.recommended_adjustment_pct,
            recommended_adjustment_total_usd=r.recommended_adjustment_total_usd,
            budget_constraint_usd=r.budget_constraint_usd,
            is_within_budget=r.is_within_budget,
            priority_score=r.priority_score,
            expected_gap_reduction_pct=r.expected_gap_reduction_pct,
            action_plan=r.action_plan,
            hitl_required=r.hitl_required,
            finalized_at=r.finalized_at.isoformat() if r.finalized_at else None,
        )
        for r in recs
    ]

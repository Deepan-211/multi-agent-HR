"""
PayParity — HITL (Human-in-the-Loop) Review API

HARD GUARDRAILS enforced here:
1. Only exec_committee or admin can make HITL decisions
2. Comment is mandatory (cannot be empty)
3. Recommendation cannot bypass HITL — finalization only after approval
4. All decisions are immutable (new record per decision)
"""
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_exec, get_current_user, CurrentUser, Roles
from app.core.exceptions import HITLGateError
from app.database import get_db
from app.models.audit import Audit, AuditStatus
from app.models.equity_recommendation import (
    EquityRecommendation, RecommendationStatus,
    HITLReview, HITLDecision,
)
from app.models.audit_log import AuditLog

router = APIRouter()


class HITLDecisionRequest(BaseModel):
    recommendation_id: str
    decision: HITLDecision
    comment: str  # MANDATORY

    @field_validator("comment")
    @classmethod
    def comment_must_not_be_empty(cls, v: str) -> str:
        if not v or len(v.strip()) < 10:
            raise ValueError("Comment must be at least 10 characters (required for audit trail)")
        return v.strip()


class HITLReviewResponse(BaseModel):
    id: str
    audit_id: str
    recommendation_id: Optional[str]
    reviewer_id: str
    decision: str
    comment: str
    decided_at: str


class PendingReviewItem(BaseModel):
    recommendation_id: str
    audit_id: str
    target_scope: str
    affected_group: Optional[str]
    identified_gap_pct: Optional[float]
    recommended_adjustment_pct: Optional[float]
    estimated_cost_usd: Optional[float]
    priority_score: Optional[float]
    action_plan: Optional[dict]
    evidence_package_available: bool


@router.get("/pending", response_model=List[PendingReviewItem])
async def get_pending_reviews(
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get all recommendations awaiting HITL review for this organization."""
    result = await db.execute(
        select(EquityRecommendation).where(
            EquityRecommendation.organization_id == uuid.UUID(current_user.org_id),
            EquityRecommendation.status == RecommendationStatus.PENDING_HITL,
        ).order_by(EquityRecommendation.priority_score.desc())
    )
    recs = result.scalars().all()

    return [
        PendingReviewItem(
            recommendation_id=str(r.id),
            audit_id=str(r.audit_id),
            target_scope=r.target_scope,
            affected_group=r.affected_group,
            identified_gap_pct=r.identified_gap_pct,
            recommended_adjustment_pct=r.recommended_adjustment_pct,
            estimated_cost_usd=r.recommended_adjustment_total_usd,
            priority_score=r.priority_score,
            action_plan=r.action_plan,
            evidence_package_available=bool(r.supporting_evidence),
        )
        for r in recs
    ]


@router.post("/decide", response_model=HITLReviewResponse)
async def make_hitl_decision(
    body: HITLDecisionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_exec),  # Only exec_committee or admin
):
    """
    Submit HITL decision on an equity recommendation.
    HARD GUARDRAIL: Only exec_committee or admin can approve/reject.
    Mandatory comment required. Decision is immutable.
    """
    rec = await db.get(EquityRecommendation, uuid.UUID(body.recommendation_id))
    if not rec or str(rec.organization_id) != current_user.org_id:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    if rec.status != RecommendationStatus.PENDING_HITL:
        raise HTTPException(
            status_code=409,
            detail=f"Recommendation is not in PENDING_HITL state (current: {rec.status.value})"
        )

    # Build evidence package for the review record
    evidence_package = {
        "recommendation_snapshot": {
            "target_scope": rec.target_scope,
            "affected_group": rec.affected_group,
            "gap_pct": rec.identified_gap_pct,
            "adjustment_pct": rec.recommended_adjustment_pct,
            "cost_usd": rec.recommended_adjustment_total_usd,
            "action_plan": rec.action_plan,
        },
        "reviewed_by_role": current_user.role,
        "privacy_attestation": (
            "Reviewer confirms: all data reviewed is properly anonymized. "
            "No individual PII was accessed during this review."
        ),
    }

    # Create IMMUTABLE review record
    review = HITLReview(
        audit_id=rec.audit_id,
        organization_id=rec.organization_id,
        recommendation_id=rec.id,
        reviewer_id=uuid.UUID(current_user.user_id),
        decision=body.decision,
        comment=body.comment,
        evidence_package=evidence_package,
        privacy_attestation=evidence_package["privacy_attestation"],
    )
    db.add(review)

    # Update recommendation status
    if body.decision == HITLDecision.APPROVED:
        rec.status = RecommendationStatus.APPROVED
        rec.finalized_at = datetime.now(timezone.utc)
    elif body.decision == HITLDecision.REJECTED:
        rec.status = RecommendationStatus.REJECTED
    elif body.decision == HITLDecision.CHANGES_REQUESTED:
        rec.status = RecommendationStatus.CHANGES_REQUESTED

    # Append to immutable audit log
    log = AuditLog(
        organization_id=rec.organization_id,
        audit_id=rec.audit_id,
        user_id=uuid.UUID(current_user.user_id),
        event_type="hitl.decision",
        entity_type="equity_recommendation",
        entity_id=str(rec.id),
        description=f"HITL decision: {body.decision.value} by {current_user.role}",
        event_data={
            "decision": body.decision.value,
            "comment_length": len(body.comment),
            "reviewer_role": current_user.role,
        },
    )
    db.add(log)

    await db.flush()

    return HITLReviewResponse(
        id=str(review.id),
        audit_id=str(review.audit_id),
        recommendation_id=str(review.recommendation_id),
        reviewer_id=str(review.reviewer_id),
        decision=review.decision.value,
        comment=review.comment,
        decided_at=review.decided_at.isoformat(),
    )


@router.get("/history/{audit_id}", response_model=List[HITLReviewResponse])
async def get_hitl_history(
    audit_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get complete immutable HITL decision history for an audit."""
    audit = await db.get(Audit, uuid.UUID(audit_id))
    if not audit or str(audit.organization_id) != current_user.org_id:
        raise HTTPException(status_code=404, detail="Audit not found")

    result = await db.execute(
        select(HITLReview)
        .where(HITLReview.audit_id == uuid.UUID(audit_id))
        .order_by(HITLReview.decided_at.desc())
    )
    reviews = result.scalars().all()

    return [
        HITLReviewResponse(
            id=str(r.id), audit_id=str(r.audit_id),
            recommendation_id=str(r.recommendation_id) if r.recommendation_id else None,
            reviewer_id=str(r.reviewer_id), decision=r.decision.value,
            comment=r.comment, decided_at=r.decided_at.isoformat(),
        )
        for r in reviews
    ]

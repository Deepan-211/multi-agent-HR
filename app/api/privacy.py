"""PayParity — Privacy Budget Monitoring API"""
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user, CurrentUser
from app.database import get_db
from app.models.privacy_budget import PrivacyBudgetRecord
from app.models.organization import Organization

router = APIRouter()


class PrivacyBudgetStatus(BaseModel):
    organization_id: str
    total_epsilon_budget: float
    total_consumed: float
    remaining: float
    utilization_pct: float
    query_count: int
    per_audit_breakdown: List[dict]


@router.get("/budget", response_model=PrivacyBudgetStatus)
async def get_privacy_budget(
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get current privacy budget status for the organization."""
    org_id = uuid.UUID(current_user.org_id)
    org = await db.get(Organization, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    records_result = await db.execute(
        select(PrivacyBudgetRecord).where(
            PrivacyBudgetRecord.organization_id == org_id
        ).order_by(PrivacyBudgetRecord.created_at.desc())
    )
    records = records_result.scalars().all()

    total_consumed = sum(r.epsilon_consumed for r in records)

    # Per-audit breakdown
    audit_eps = {}
    for r in records:
        aid = str(r.audit_id) if r.audit_id else "global"
        audit_eps[aid] = audit_eps.get(aid, 0) + r.epsilon_consumed

    return PrivacyBudgetStatus(
        organization_id=str(org_id),
        total_epsilon_budget=org.privacy_epsilon_budget,
        total_consumed=round(total_consumed, 4),
        remaining=round(max(0.0, org.privacy_epsilon_budget - total_consumed), 4),
        utilization_pct=round((total_consumed / org.privacy_epsilon_budget) * 100, 2),
        query_count=len(records),
        per_audit_breakdown=[
            {"audit_id": aid, "epsilon_consumed": round(eps, 4)}
            for aid, eps in audit_eps.items()
        ],
    )


@router.get("/budget/audit/{audit_id}")
async def get_audit_privacy_budget(
    audit_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get privacy budget breakdown for a specific audit."""
    records_result = await db.execute(
        select(PrivacyBudgetRecord).where(
            PrivacyBudgetRecord.audit_id == uuid.UUID(audit_id),
            PrivacyBudgetRecord.organization_id == uuid.UUID(current_user.org_id),
        )
    )
    records = records_result.scalars().all()

    return {
        "audit_id": audit_id,
        "queries": [
            {
                "query_name": r.query_name,
                "epsilon_consumed": r.epsilon_consumed,
                "mechanism": r.mechanism,
                "created_at": r.created_at.isoformat(),
            }
            for r in records
        ],
        "total_consumed": sum(r.epsilon_consumed for r in records),
    }

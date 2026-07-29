"""
PayParity — Bias Flags API
"""
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user, CurrentUser
from app.database import get_db
from app.models.bias_flag import BiasFlag
from app.models.audit import Audit

router = APIRouter()


class BiasFlagResponse(BaseModel):
    id: str
    audit_id: str
    employee_token: Optional[str]
    bias_type: str
    severity: str
    confidence: float
    evidence_text: Optional[str]
    flagged_phrases: Optional[list]
    explanation: Optional[str]
    dp_noise_applied: bool


@router.get("/audit/{audit_id}", response_model=List[BiasFlagResponse])
async def get_bias_flags(
    audit_id: str,
    severity: Optional[str] = None,
    bias_type: Optional[str] = None,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get bias flags for an audit with optional filters."""
    audit = await db.get(Audit, uuid.UUID(audit_id))
    if not audit or str(audit.organization_id) != current_user.org_id:
        raise HTTPException(status_code=404, detail="Audit not found")

    query = select(BiasFlag).where(BiasFlag.audit_id == uuid.UUID(audit_id))
    if severity:
        query = query.where(BiasFlag.severity == severity)
    if bias_type:
        query = query.where(BiasFlag.bias_type == bias_type)
    query = query.limit(limit)

    result = await db.execute(query)
    flags = result.scalars().all()

    return [
        BiasFlagResponse(
            id=str(f.id),
            audit_id=str(f.audit_id),
            employee_token=f.employee_token,
            bias_type=f.bias_type.value,
            severity=f.severity.value,
            confidence=f.confidence,
            evidence_text=f.evidence_text,
            flagged_phrases=f.flagged_phrases,
            explanation=f.explanation,
            dp_noise_applied=f.dp_noise_applied,
        )
        for f in flags
    ]

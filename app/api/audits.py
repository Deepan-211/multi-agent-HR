"""
PayParity — Audits API
Create, manage, and run pay equity audits.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user, require_analyst, CurrentUser
from app.core.exceptions import AuditStateError
from app.database import get_db
from app.models.audit import Audit, AuditStatus

router = APIRouter()


class AuditCreate(BaseModel):
    name: str
    description: Optional[str] = None
    allocated_epsilon: float = 1.0
    audit_config: Optional[dict] = None


class AuditResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    status: str
    allocated_epsilon: float
    consumed_epsilon: float
    celery_task_id: Optional[str]
    created_at: str
    started_at: Optional[str]
    completed_at: Optional[str]
    summary_results: Optional[dict]


def _audit_to_response(audit: Audit) -> AuditResponse:
    return AuditResponse(
        id=str(audit.id),
        name=audit.name,
        description=audit.description,
        status=audit.status.value,
        allocated_epsilon=audit.allocated_epsilon,
        consumed_epsilon=audit.consumed_epsilon,
        celery_task_id=audit.celery_task_id,
        created_at=audit.created_at.isoformat(),
        started_at=audit.started_at.isoformat() if audit.started_at else None,
        completed_at=audit.completed_at.isoformat() if audit.completed_at else None,
        summary_results=audit.summary_results,
    )


@router.post("/", response_model=AuditResponse, status_code=201)
async def create_audit(
    body: AuditCreate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_analyst),
):
    """Create a new audit in draft state."""
    if body.allocated_epsilon <= 0 or body.allocated_epsilon > 10.0:
        raise HTTPException(
            status_code=422,
            detail="allocated_epsilon must be between 0 and 10.0"
        )

    audit = Audit(
        organization_id=uuid.UUID(current_user.org_id),
        created_by_id=uuid.UUID(current_user.user_id),
        name=body.name,
        description=body.description,
        allocated_epsilon=body.allocated_epsilon,
        audit_config=body.audit_config or {},
    )
    db.add(audit)
    await db.flush()
    return _audit_to_response(audit)


@router.get("/", response_model=List[AuditResponse])
async def list_audits(
    status: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """List audits for the current organization."""
    query = select(Audit).where(
        Audit.organization_id == uuid.UUID(current_user.org_id),
        Audit.deleted_at.is_(None),
    )
    if status:
        query = query.where(Audit.status == status)
    query = query.order_by(Audit.created_at.desc()).limit(limit).offset(offset)

    result = await db.execute(query)
    audits = result.scalars().all()
    return [_audit_to_response(a) for a in audits]


@router.get("/{audit_id}", response_model=AuditResponse)
async def get_audit(
    audit_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get audit details."""
    audit = await db.get(Audit, uuid.UUID(audit_id))
    if not audit or str(audit.organization_id) != current_user.org_id:
        raise HTTPException(status_code=404, detail="Audit not found")
    return _audit_to_response(audit)


@router.post("/{audit_id}/start", response_model=AuditResponse)
async def start_audit(
    audit_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_analyst),
):
    """
    Start the multi-agent swarm for an audit.
    Transitions: draft → running (dispatches Celery task).
    """
    audit = await db.get(Audit, uuid.UUID(audit_id))
    if not audit or str(audit.organization_id) != current_user.org_id:
        raise HTTPException(status_code=404, detail="Audit not found")

    if not audit.can_transition_to(AuditStatus.RUNNING):
        raise HTTPException(
            status_code=409,
            detail=f"Cannot start audit in state '{audit.status.value}'"
        )

    # Dispatch Celery task
    from app.workers.audit_worker import run_audit_swarm
    task = run_audit_swarm.delay(audit_id=audit_id, organization_id=current_user.org_id)

    audit.status = AuditStatus.RUNNING
    audit.started_at = datetime.now(timezone.utc)
    audit.celery_task_id = task.id
    await db.flush()

    return _audit_to_response(audit)

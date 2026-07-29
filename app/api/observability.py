"""
PayParity — Observability Dashboard API
Real-time and historical metrics with SSE support.
"""
import asyncio
import json
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sse_starlette.sse import EventSourceResponse

from app.core.auth import get_current_user, CurrentUser
from app.database import get_db
from app.models.audit import Audit, AuditStatus
from app.models.bias_flag import BiasFlag
from app.models.equity_recommendation import EquityRecommendation, RecommendationStatus
from app.models.privacy_budget import PrivacyBudgetRecord
from app.models.observability_metric import ObservabilityMetric

router = APIRouter()


class DashboardSummary(BaseModel):
    total_audits: int
    active_audits: int
    hitl_pending_count: int
    approved_recommendations: int
    total_bias_flags: int
    avg_epsilon_consumed: float
    org_epsilon_budget: float
    org_epsilon_remaining: float


class MetricDataPoint(BaseModel):
    metric_name: str
    metric_value: float
    metric_unit: Optional[str]
    dimension: Optional[str]
    recorded_at: str


@router.get("/dashboard", response_model=DashboardSummary)
async def get_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get live dashboard summary for the organization."""
    org_id = uuid.UUID(current_user.org_id)

    total_audits = await db.scalar(
        select(func.count(Audit.id)).where(
            Audit.organization_id == org_id, Audit.deleted_at.is_(None)
        )
    )
    active_audits = await db.scalar(
        select(func.count(Audit.id)).where(
            Audit.organization_id == org_id,
            Audit.status == AuditStatus.RUNNING,
        )
    )
    hitl_pending = await db.scalar(
        select(func.count(EquityRecommendation.id)).where(
            EquityRecommendation.organization_id == org_id,
            EquityRecommendation.status == RecommendationStatus.PENDING_HITL,
        )
    )
    approved_recs = await db.scalar(
        select(func.count(EquityRecommendation.id)).where(
            EquityRecommendation.organization_id == org_id,
            EquityRecommendation.status == RecommendationStatus.APPROVED,
        )
    )
    total_flags = await db.scalar(
        select(func.count(BiasFlag.id)).where(BiasFlag.organization_id == org_id)
    )
    avg_epsilon = await db.scalar(
        select(func.avg(PrivacyBudgetRecord.epsilon_consumed)).where(
            PrivacyBudgetRecord.organization_id == org_id
        )
    )

    # Get org budget
    from app.models.organization import Organization
    org = await db.get(Organization, org_id)
    epsilon_budget = org.privacy_epsilon_budget if org else 10.0

    total_consumed = await db.scalar(
        select(func.sum(PrivacyBudgetRecord.epsilon_consumed)).where(
            PrivacyBudgetRecord.organization_id == org_id
        )
    ) or 0.0

    return DashboardSummary(
        total_audits=total_audits or 0,
        active_audits=active_audits or 0,
        hitl_pending_count=hitl_pending or 0,
        approved_recommendations=approved_recs or 0,
        total_bias_flags=total_flags or 0,
        avg_epsilon_consumed=round(avg_epsilon or 0.0, 4),
        org_epsilon_budget=epsilon_budget,
        org_epsilon_remaining=max(0.0, epsilon_budget - total_consumed),
    )


@router.get("/metrics", response_model=List[MetricDataPoint])
async def get_metrics(
    metric_name: Optional[str] = None,
    since_hours: int = 24,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get time-series metrics snapshots."""
    org_id = uuid.UUID(current_user.org_id)
    since = datetime.now(timezone.utc) - timedelta(hours=since_hours)

    query = select(ObservabilityMetric).where(
        ObservabilityMetric.recorded_at >= since,
    )
    if metric_name:
        query = query.where(ObservabilityMetric.metric_name == metric_name)
    query = query.order_by(ObservabilityMetric.recorded_at.desc()).limit(limit)

    result = await db.execute(query)
    metrics = result.scalars().all()

    return [
        MetricDataPoint(
            metric_name=m.metric_name,
            metric_value=m.metric_value,
            metric_unit=m.metric_unit,
            dimension=m.dimension,
            recorded_at=m.recorded_at.isoformat(),
        )
        for m in metrics
    ]


@router.get("/live")
async def live_metrics_stream(
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
):
    """SSE stream for live observability metrics (updates every 5 seconds)."""

    async def generator():
        while True:
            if await request.is_disconnected():
                break

            # Emit current dashboard stats
            from sqlalchemy import create_engine
            # Simplified: in production use a proper async Redis pub/sub
            yield {
                "event": "heartbeat",
                "data": json.dumps({"timestamp": datetime.now(timezone.utc).isoformat()}),
            }
            await asyncio.sleep(5)

    return EventSourceResponse(generator())

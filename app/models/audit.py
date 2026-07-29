"""
PayParity — Audit Model
State machine: draft → running → agents_completed → hitl_pending → approved/rejected
"""
import uuid
import enum
from datetime import datetime, timezone
from typing import Optional, List

from sqlalchemy import String, Text, Float, DateTime, ForeignKey, JSON, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class AuditStatus(str, enum.Enum):
    DRAFT = "draft"
    RUNNING = "running"
    AGENTS_COMPLETED = "agents_completed"
    HITL_PENDING = "hitl_pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    FAILED = "failed"


# Valid state transitions
AUDIT_TRANSITIONS = {
    AuditStatus.DRAFT: [AuditStatus.RUNNING],
    AuditStatus.RUNNING: [AuditStatus.AGENTS_COMPLETED, AuditStatus.FAILED],
    AuditStatus.AGENTS_COMPLETED: [AuditStatus.HITL_PENDING],
    AuditStatus.HITL_PENDING: [AuditStatus.APPROVED, AuditStatus.REJECTED],
    AuditStatus.APPROVED: [],
    AuditStatus.REJECTED: [AuditStatus.DRAFT],
    AuditStatus.FAILED: [AuditStatus.DRAFT],
}


class Audit(Base):
    __tablename__ = "audits"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True
    )
    created_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[AuditStatus] = mapped_column(
        SAEnum(AuditStatus), nullable=False, default=AuditStatus.DRAFT, index=True
    )

    # Scope configuration
    audit_config: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    # e.g. {"departments": ["eng", "sales"], "review_period": "2023", "budget_constraint": 500000}

    # Privacy budget allocated to this audit
    allocated_epsilon: Mapped[float] = mapped_column(Float, default=1.0)
    consumed_epsilon: Mapped[float] = mapped_column(Float, default=0.0)

    # Celery task ID for background agent run
    celery_task_id: Mapped[Optional[str]] = mapped_column(String(255))

    # Summary results (aggregate, not individual)
    summary_results: Mapped[Optional[dict]] = mapped_column(JSON)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    # Relationships
    organization: Mapped["Organization"] = relationship(back_populates="audits")
    agent_runs: Mapped[List["AgentRun"]] = relationship(back_populates="audit")
    bias_flags: Mapped[List["BiasFlag"]] = relationship(back_populates="audit")
    counterfactuals: Mapped[List["CounterfactualExperiment"]] = relationship(back_populates="audit")
    recommendations: Mapped[List["EquityRecommendation"]] = relationship(back_populates="audit")
    hitl_reviews: Mapped[List["HITLReview"]] = relationship(back_populates="audit")
    privacy_budgets: Mapped[List["PrivacyBudgetRecord"]] = relationship(back_populates="audit")

    def can_transition_to(self, new_status: AuditStatus) -> bool:
        return new_status in AUDIT_TRANSITIONS.get(self.status, [])

    def __repr__(self) -> str:
        return f"<Audit id={self.id} status={self.status}>"

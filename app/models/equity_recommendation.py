"""
PayParity — Equity Recommendation & HITL Models
"""
import uuid
import enum
from datetime import datetime, timezone
from typing import Optional, List

from sqlalchemy import String, Text, Float, DateTime, ForeignKey, JSON, Enum as SAEnum, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class RecommendationStatus(str, enum.Enum):
    PENDING_HITL = "pending_hitl"
    APPROVED = "approved"
    REJECTED = "rejected"
    CHANGES_REQUESTED = "changes_requested"


class EquityRecommendation(Base):
    __tablename__ = "equity_recommendations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    audit_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audits.id"), nullable=False, index=True
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False
    )
    agent_run_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agent_runs.id")
    )

    status: Mapped[RecommendationStatus] = mapped_column(
        SAEnum(RecommendationStatus),
        nullable=False,
        default=RecommendationStatus.PENDING_HITL,
        index=True,
    )

    # Target scope (anonymized group, not individual)
    target_scope: Mapped[str] = mapped_column(String(100))
    # e.g. "G1 in Engineering at L4"
    affected_group: Mapped[Optional[str]] = mapped_column(String(50))
    affected_employee_count_dp: Mapped[Optional[int]] = mapped_column()  # DP count

    # Gap analysis
    identified_gap_pct: Mapped[Optional[float]] = mapped_column(Float)
    gap_type: Mapped[Optional[str]] = mapped_column(String(50))  # "gender", "racial", "combined"

    # Adjustment proposal
    recommended_adjustment_pct: Mapped[Optional[float]] = mapped_column(Float)
    recommended_adjustment_total_usd: Mapped[Optional[float]] = mapped_column(Float)

    # Budget compliance
    budget_constraint_usd: Mapped[Optional[float]] = mapped_column(Float)
    is_within_budget: Mapped[bool] = mapped_column(Boolean, default=True)

    # Prioritization
    priority_score: Mapped[Optional[float]] = mapped_column(Float)  # 0-100
    expected_gap_reduction_pct: Mapped[Optional[float]] = mapped_column(Float)

    # Detailed plan
    action_plan: Mapped[Optional[dict]] = mapped_column(JSON)
    supporting_evidence: Mapped[Optional[dict]] = mapped_column(JSON)
    compliance_notes: Mapped[Optional[str]] = mapped_column(Text)

    # HARD GUARDRAIL: cannot be finalized without HITL approval
    hitl_required: Mapped[bool] = mapped_column(Boolean, default=True)
    finalized_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    audit: Mapped["Audit"] = relationship(back_populates="recommendations")
    hitl_reviews: Mapped[List["HITLReview"]] = relationship(back_populates="recommendation")


class HITLDecision(str, enum.Enum):
    APPROVED = "approved"
    REJECTED = "rejected"
    CHANGES_REQUESTED = "changes_requested"


class HITLReview(Base):
    """
    Human-in-the-Loop review record.
    Immutable once created (no updates allowed — new record per decision).
    """
    __tablename__ = "hitl_reviews"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    audit_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audits.id"), nullable=False, index=True
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False
    )
    recommendation_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("equity_recommendations.id"), index=True
    )
    reviewer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )

    decision: Mapped[HITLDecision] = mapped_column(SAEnum(HITLDecision), nullable=False)

    # Mandatory comment (enforced at application layer too)
    comment: Mapped[str] = mapped_column(Text, nullable=False)

    # Evidence package snapshot (immutable copy)
    evidence_package: Mapped[Optional[dict]] = mapped_column(JSON)

    # Privacy attestation
    privacy_attestation: Mapped[Optional[str]] = mapped_column(Text)

    # Immutable timestamp
    decided_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    audit: Mapped["Audit"] = relationship(back_populates="hitl_reviews")
    reviewer: Mapped["User"] = relationship(back_populates="hitl_reviews")
    recommendation: Mapped[Optional["EquityRecommendation"]] = relationship(
        back_populates="hitl_reviews"
    )

"""
PayParity — Privacy Budget Record
Tracks ε consumption per audit and per organization over time.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import String, Float, DateTime, ForeignKey, JSON, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class PrivacyBudgetRecord(Base):
    """
    Immutable append-only log of privacy budget consumption.
    One record per query/operation that consumes ε.
    """
    __tablename__ = "privacy_budget_records"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True
    )
    audit_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audits.id"), index=True
    )
    agent_run_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("agent_runs.id")
    )

    query_name: Mapped[str] = mapped_column(String(255), nullable=False)
    epsilon_consumed: Mapped[float] = mapped_column(Float, nullable=False)
    delta_consumed: Mapped[float] = mapped_column(Float, default=0.0)
    mechanism: Mapped[str] = mapped_column(String(50), default="laplace")
    # e.g. "laplace", "gaussian", "exponential"

    sensitivity: Mapped[Optional[float]] = mapped_column(Float)
    noise_scale: Mapped[Optional[float]] = mapped_column(Float)

    # Cumulative after this record
    cumulative_epsilon_audit: Mapped[float] = mapped_column(Float)
    cumulative_epsilon_org: Mapped[float] = mapped_column(Float)

    # Budget state at time of record
    budget_total: Mapped[float] = mapped_column(Float)
    budget_remaining: Mapped[float] = mapped_column(Float)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    organization: Mapped["Organization"] = relationship(back_populates="privacy_budgets")
    audit: Mapped[Optional["Audit"]] = relationship(back_populates="privacy_budgets")

"""
PayParity — Counterfactual Experiment Model
Records results of demographic-swap counterfactual audits.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import String, Text, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class CounterfactualExperiment(Base):
    __tablename__ = "counterfactual_experiments"

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

    # What attribute was swapped (e.g. "gender_group", "ethnicity_group")
    attribute_swapped: Mapped[str] = mapped_column(String(50), nullable=False)
    from_group: Mapped[str] = mapped_column(String(20), nullable=False)
    to_group: Mapped[str] = mapped_column(String(20), nullable=False)

    # Aggregated results (never individual)
    sample_size: Mapped[int] = mapped_column(default=0)
    original_mean_rating: Mapped[Optional[float]] = mapped_column(Float)
    counterfactual_mean_rating: Mapped[Optional[float]] = mapped_column(Float)
    rating_delta: Mapped[Optional[float]] = mapped_column(Float)  # CF - original
    effect_size_cohens_d: Mapped[Optional[float]] = mapped_column(Float)
    p_value: Mapped[Optional[float]] = mapped_column(Float)
    is_statistically_significant: Mapped[Optional[bool]] = mapped_column()

    # Distribution details
    distribution_data: Mapped[Optional[dict]] = mapped_column(JSON)

    # Natural language interpretation
    interpretation: Mapped[Optional[str]] = mapped_column(Text)

    # DP
    dp_epsilon_used: Mapped[Optional[float]] = mapped_column(Float)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    audit: Mapped["Audit"] = relationship(back_populates="counterfactuals")

    def __repr__(self) -> str:
        return (
            f"<Counterfactual attr={self.attribute_swapped} "
            f"{self.from_group}→{self.to_group} delta={self.rating_delta}>"
        )

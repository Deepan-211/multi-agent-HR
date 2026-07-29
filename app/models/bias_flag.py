"""
PayParity — Bias Flag Model
Detected bias evidence from the Review Text Parser Agent.
"""
import uuid
import enum
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import String, Text, Float, DateTime, ForeignKey, JSON, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class BiasSeverity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class BiasType(str, enum.Enum):
    GENDERED_LANGUAGE = "gendered_language"
    RACIAL_BIAS = "racial_bias"
    AGE_BIAS = "age_bias"
    DOUBLE_STANDARD = "double_standard"
    PERSONALITY_VS_PERFORMANCE = "personality_vs_performance"
    ATTRIBUTION_BIAS = "attribution_bias"
    STEREOTYPING = "stereotyping"


class BiasFlag(Base):
    __tablename__ = "bias_flags"

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

    # Source reference (anonymized token only)
    employee_token: Mapped[Optional[str]] = mapped_column(String(100), index=True)
    review_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True))

    bias_type: Mapped[BiasType] = mapped_column(SAEnum(BiasType), nullable=False)
    severity: Mapped[BiasSeverity] = mapped_column(SAEnum(BiasSeverity), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)  # 0.0 - 1.0

    # Evidence: snippet from the review text (anonymized)
    evidence_text: Mapped[Optional[str]] = mapped_column(Text)
    evidence_span_start: Mapped[Optional[int]] = mapped_column()
    evidence_span_end: Mapped[Optional[int]] = mapped_column()

    # Pattern details
    flagged_phrases: Mapped[Optional[list]] = mapped_column(JSON)
    # e.g. [{"phrase": "overly emotional", "category": "gendered_criticism"}]

    explanation: Mapped[Optional[str]] = mapped_column(Text)

    # Differential privacy: this record had noise applied
    dp_noise_applied: Mapped[bool] = mapped_column(default=False)
    dp_epsilon_used: Mapped[Optional[float]] = mapped_column(Float)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    audit: Mapped["Audit"] = relationship(back_populates="bias_flags")

    def __repr__(self) -> str:
        return f"<BiasFlag type={self.bias_type} severity={self.severity}>"

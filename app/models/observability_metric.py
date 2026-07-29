"""
PayParity — Observability Metrics Snapshots
Time-series metric records for dashboard queries.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import String, Float, DateTime, ForeignKey, JSON, Integer
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class ObservabilityMetric(Base):
    __tablename__ = "observability_metrics"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    organization_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), index=True
    )
    audit_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audits.id"), index=True
    )

    metric_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    # e.g. "pay_gap_gender_pct", "bias_flag_count", "epsilon_consumed", "hitl_pending_count"

    metric_value: Mapped[float] = mapped_column(Float, nullable=False)
    metric_unit: Mapped[Optional[str]] = mapped_column(String(50))
    # e.g. "percent", "count", "epsilon", "seconds", "usd"

    dimension: Mapped[Optional[str]] = mapped_column(String(100))
    # e.g. "gender", "race", "department_eng"

    metadata_: Mapped[Optional[dict]] = mapped_column(JSON)

    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )

    def __repr__(self) -> str:
        return f"<Metric {self.metric_name}={self.metric_value} at={self.recorded_at}>"

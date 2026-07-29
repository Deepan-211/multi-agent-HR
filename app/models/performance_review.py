"""
PayParity — Anonymized Performance Review Model
Stores review text with NO direct PII. All identifiers are anonymized tokens.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import String, Text, Float, Integer, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class PerformanceReview(Base):
    __tablename__ = "performance_reviews"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True
    )
    audit_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audits.id"), index=True
    )

    # Anonymized employee token (NOT a real name or ID)
    employee_token: Mapped[str] = mapped_column(String(100), nullable=False, index=True)

    # Anonymized manager token
    manager_token: Mapped[Optional[str]] = mapped_column(String(100), index=True)

    # Review metadata (aggregated, no individual PII)
    review_period: Mapped[str] = mapped_column(String(20))  # e.g. "2023-H2"
    department_code: Mapped[Optional[str]] = mapped_column(String(50))
    role_level: Mapped[Optional[str]] = mapped_column(String(50))  # L1, L2 ... L8
    tenure_band: Mapped[Optional[str]] = mapped_column(String(20))  # "0-2y", "2-5y", etc.
    location_region: Mapped[Optional[str]] = mapped_column(String(50))

    # Anonymized demographic proxies (k-anonymized group, NOT individual)
    # Values are group codes, never individual attributes
    gender_group: Mapped[Optional[str]] = mapped_column(String(20))  # e.g. "G1", "G2"
    ethnicity_group: Mapped[Optional[str]] = mapped_column(String(20))  # e.g. "E1", "E2"

    # Review content
    review_text: Mapped[str] = mapped_column(Text, nullable=False)
    performance_rating: Mapped[Optional[float]] = mapped_column(Float)  # 1.0 - 5.0
    is_anonymized_verified: Mapped[bool] = mapped_column(Boolean, default=False)

    # Processing flags
    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    def __repr__(self) -> str:
        return f"<PerformanceReview id={self.id} token={self.employee_token}>"

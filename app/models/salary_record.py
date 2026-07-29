"""
PayParity — Anonymized Salary & Promotion Records
No PII — identified only by anonymized employee tokens.
"""
import uuid
from datetime import datetime, timezone, date
from typing import Optional

from sqlalchemy import String, Float, Integer, DateTime, Date, ForeignKey, JSON, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class SalaryRecord(Base):
    """Annual salary snapshot per anonymized employee."""
    __tablename__ = "salary_records"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True
    )
    audit_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audits.id"), index=True
    )

    employee_token: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    record_year: Mapped[int] = mapped_column(Integer, nullable=False)

    # Compensation data
    base_salary: Mapped[float] = mapped_column(Float, nullable=False)
    total_compensation: Mapped[Optional[float]] = mapped_column(Float)
    bonus_pct: Mapped[Optional[float]] = mapped_column(Float)
    equity_grant_usd: Mapped[Optional[float]] = mapped_column(Float)

    # Role / career context (anonymized codes)
    job_family_code: Mapped[Optional[str]] = mapped_column(String(50))
    role_level: Mapped[Optional[str]] = mapped_column(String(20))
    department_code: Mapped[Optional[str]] = mapped_column(String(50))
    location_region: Mapped[Optional[str]] = mapped_column(String(50))
    tenure_years: Mapped[Optional[float]] = mapped_column(Float)
    performance_rating: Mapped[Optional[float]] = mapped_column(Float)

    # Anonymized group proxies
    gender_group: Mapped[Optional[str]] = mapped_column(String(20))
    ethnicity_group: Mapped[Optional[str]] = mapped_column(String(20))

    # Market data reference
    market_p50_salary: Mapped[Optional[float]] = mapped_column(Float)
    compa_ratio: Mapped[Optional[float]] = mapped_column(Float)  # salary / market_p50

    is_anonymized_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class PromotionRecord(Base):
    """Promotion event per anonymized employee."""
    __tablename__ = "promotion_records"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True
    )
    audit_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audits.id"), index=True
    )

    employee_token: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    promotion_year: Mapped[int] = mapped_column(Integer, nullable=False)
    from_level: Mapped[Optional[str]] = mapped_column(String(20))
    to_level: Mapped[Optional[str]] = mapped_column(String(20))
    time_in_level_months: Mapped[Optional[int]] = mapped_column(Integer)
    department_code: Mapped[Optional[str]] = mapped_column(String(50))
    gender_group: Mapped[Optional[str]] = mapped_column(String(20))
    ethnicity_group: Mapped[Optional[str]] = mapped_column(String(20))

    is_anonymized_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

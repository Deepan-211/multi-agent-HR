"""
PayParity — Organization / Workspace Model
Multi-tenant root entity. Each org has its own privacy budget.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional, List

from sqlalchemy import String, Boolean, Float, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    industry: Mapped[Optional[str]] = mapped_column(String(100))
    country: Mapped[Optional[str]] = mapped_column(String(100))

    # Privacy configuration
    privacy_epsilon_budget: Mapped[float] = mapped_column(Float, default=10.0)
    privacy_delta: Mapped[float] = mapped_column(Float, default=1e-5)

    # Guardrails config (JSON)
    guardrails_config: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)

    # Soft delete + retention
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    data_retention_days: Mapped[int] = mapped_column(default=365)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    # Relationships
    users: Mapped[List["User"]] = relationship(back_populates="organization")
    audits: Mapped[List["Audit"]] = relationship(back_populates="organization")
    privacy_budgets: Mapped[List["PrivacyBudgetRecord"]] = relationship(
        back_populates="organization"
    )

    def __repr__(self) -> str:
        return f"<Organization id={self.id} slug={self.slug}>"

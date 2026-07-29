"""
PayParity — Immutable Audit Log
Append-only record of all significant system events.
Supports compliance audit trails.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class AuditLog(Base):
    """
    Immutable audit trail. No updates or deletes permitted.
    Enforced via DB trigger in production (see migration).
    """
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    organization_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), index=True
    )
    audit_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audits.id"), index=True
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True))

    event_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    # e.g. "audit.created", "agent.started", "hitl.decision", "privacy.budget_consumed"

    entity_type: Mapped[Optional[str]] = mapped_column(String(50))
    entity_id: Mapped[Optional[str]] = mapped_column(String(100))

    description: Mapped[str] = mapped_column(Text, nullable=False)

    # Structured event data (no PII)
    event_data: Mapped[Optional[dict]] = mapped_column(JSON)

    # Request context
    ip_address: Mapped[Optional[str]] = mapped_column(String(45))
    user_agent: Mapped[Optional[str]] = mapped_column(String(500))

    # Immutable timestamp
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<AuditLog event={self.event_type} at={self.created_at}>"

"""
PayParity — Agent Run Model
Tracks execution of each specialist agent within an audit.
"""
import uuid
import enum
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import String, Text, Float, DateTime, ForeignKey, JSON, Enum as SAEnum, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class AgentRunStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    RETRYING = "retrying"


class AgentRun(Base):
    __tablename__ = "agent_runs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    audit_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audits.id"), nullable=False, index=True
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False
    )

    agent_name: Mapped[str] = mapped_column(String(100), nullable=False)
    # e.g. "review_parser", "compensation_analytics", "counterfactual_audit", "equity_framework"

    status: Mapped[AgentRunStatus] = mapped_column(
        SAEnum(AgentRunStatus), nullable=False, default=AgentRunStatus.PENDING
    )

    # Reasoning trace: list of {step, tool, input, output, timestamp} objects
    reasoning_trace: Mapped[Optional[list]] = mapped_column(JSON, default=list)

    # Final structured output from agent
    output: Mapped[Optional[dict]] = mapped_column(JSON)

    # Error info if failed
    error_message: Mapped[Optional[str]] = mapped_column(Text)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)

    # Privacy budget consumed by this agent run
    epsilon_consumed: Mapped[float] = mapped_column(Float, default=0.0)

    # Timing
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    duration_seconds: Mapped[Optional[float]] = mapped_column(Float)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    audit: Mapped["Audit"] = relationship(back_populates="agent_runs")

    def __repr__(self) -> str:
        return f"<AgentRun agent={self.agent_name} status={self.status}>"

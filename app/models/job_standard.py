"""
PayParity — Job Architecture Standard (pgvector)
Vector-embedded job descriptions for semantic retrieval during equity analysis.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional, List

from sqlalchemy import String, Text, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class JobStandard(Base):
    """
    Job architecture standards stored with vector embeddings
    for semantic similarity retrieval during equity analysis.
    """
    __tablename__ = "job_standards"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    organization_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), index=True
    )
    # If org_id is None, this is a global/industry standard

    job_family: Mapped[str] = mapped_column(String(100), nullable=False)
    job_level: Mapped[str] = mapped_column(String(20), nullable=False)
    job_title: Mapped[str] = mapped_column(String(255), nullable=False)
    industry: Mapped[Optional[str]] = mapped_column(String(100))

    # Text content
    responsibilities: Mapped[Optional[str]] = mapped_column(Text)
    competencies: Mapped[Optional[str]] = mapped_column(Text)
    level_expectations: Mapped[Optional[str]] = mapped_column(Text)

    # Market compensation data
    market_p10_salary: Mapped[Optional[float]] = mapped_column(Float)
    market_p25_salary: Mapped[Optional[float]] = mapped_column(Float)
    market_p50_salary: Mapped[Optional[float]] = mapped_column(Float)
    market_p75_salary: Mapped[Optional[float]] = mapped_column(Float)
    market_p90_salary: Mapped[Optional[float]] = mapped_column(Float)

    # Vector embedding (1536 dims for text-embedding-ada-002, 384 for all-MiniLM)
    embedding: Mapped[Optional[List[float]]] = mapped_column(JSON)

    metadata_: Mapped[Optional[dict]] = mapped_column(JSON)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def __repr__(self) -> str:
        return f"<JobStandard {self.job_family} {self.job_level}>"

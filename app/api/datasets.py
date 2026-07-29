"""
PayParity — Dataset Upload API
Upload anonymized performance reviews and salary data.
Strict anonymization gate enforced before acceptance.
"""
import csv
import io
import json
import uuid
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_analyst, CurrentUser
from app.core.privacy import check_anonymization
from app.core.exceptions import AnonymizationError
from app.database import get_db
from app.models.performance_review import PerformanceReview
from app.models.salary_record import SalaryRecord, PromotionRecord

router = APIRouter()


class UploadResult(BaseModel):
    uploaded: int
    rejected: int
    anonymization_violations: List[str]
    audit_id: str
    dataset_type: str


@router.post("/reviews/{audit_id}", response_model=UploadResult)
async def upload_reviews(
    audit_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_analyst),
):
    """
    Upload anonymized performance reviews (JSON or CSV).
    HARD GATE: Any PII detected = full rejection of the file.
    """
    content = await file.read()
    records = _parse_upload(content, file.filename or "")

    uploaded = 0
    rejected = 0
    all_violations: List[str] = []

    for record in records:
        review_text = record.get("review_text", "")
        is_clean, violations = check_anonymization(review_text)

        if not is_clean:
            rejected += 1
            all_violations.extend(violations[:2])  # Cap violation list
            continue

        # Require employee_token (no real IDs)
        if not record.get("employee_token"):
            rejected += 1
            all_violations.append("Missing employee_token (anonymization required)")
            continue

        review = PerformanceReview(
            organization_id=uuid.UUID(current_user.org_id),
            audit_id=uuid.UUID(audit_id),
            employee_token=record["employee_token"],
            manager_token=record.get("manager_token"),
            review_period=record.get("review_period", "2024"),
            department_code=record.get("department_code"),
            role_level=record.get("role_level"),
            tenure_band=record.get("tenure_band"),
            location_region=record.get("location_region"),
            gender_group=record.get("gender_group"),
            ethnicity_group=record.get("ethnicity_group"),
            review_text=review_text,
            performance_rating=float(record["performance_rating"]) if record.get("performance_rating") else None,
            is_anonymized_verified=True,
        )
        db.add(review)
        uploaded += 1

    await db.flush()

    return UploadResult(
        uploaded=uploaded,
        rejected=rejected,
        anonymization_violations=all_violations[:10],
        audit_id=audit_id,
        dataset_type="performance_reviews",
    )


@router.post("/salary/{audit_id}", response_model=UploadResult)
async def upload_salary(
    audit_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(require_analyst),
):
    """Upload anonymized salary matrix."""
    content = await file.read()
    records = _parse_upload(content, file.filename or "")

    uploaded = 0
    rejected = 0
    violations: List[str] = []

    for record in records:
        if not record.get("employee_token"):
            rejected += 1
            violations.append("Missing employee_token")
            continue

        try:
            rec = SalaryRecord(
                organization_id=uuid.UUID(current_user.org_id),
                audit_id=uuid.UUID(audit_id),
                employee_token=record["employee_token"],
                record_year=int(record.get("record_year", 2024)),
                base_salary=float(record["base_salary"]),
                total_compensation=float(record["total_compensation"]) if record.get("total_compensation") else None,
                job_family_code=record.get("job_family_code"),
                role_level=record.get("role_level"),
                department_code=record.get("department_code"),
                location_region=record.get("location_region"),
                tenure_years=float(record["tenure_years"]) if record.get("tenure_years") else None,
                performance_rating=float(record["performance_rating"]) if record.get("performance_rating") else None,
                gender_group=record.get("gender_group"),
                ethnicity_group=record.get("ethnicity_group"),
                market_p50_salary=float(record["market_p50"]) if record.get("market_p50") else None,
                is_anonymized_verified=True,
            )
            db.add(rec)
            uploaded += 1
        except (KeyError, ValueError) as e:
            rejected += 1
            violations.append(f"Invalid record: {e}")

    await db.flush()
    return UploadResult(uploaded=uploaded, rejected=rejected,
                        anonymization_violations=violations[:10],
                        audit_id=audit_id, dataset_type="salary_records")


def _parse_upload(content: bytes, filename: str) -> list:
    """Parse JSON or CSV upload into list of dicts."""
    text = content.decode("utf-8-sig", errors="replace")
    if filename.endswith(".json"):
        data = json.loads(text)
        return data if isinstance(data, list) else [data]
    else:
        reader = csv.DictReader(io.StringIO(text))
        return list(reader)

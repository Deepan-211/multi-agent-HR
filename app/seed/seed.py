"""
PayParity — Database Seed Script
Populates the database with demo data and runs a complete audit flow.
Usage: python -m app.seed.seed
"""
import asyncio
import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

from passlib.context import CryptContext
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SAMPLE_DATA_DIR = Path(__file__).parent / "sample_data"

# ── Demo credentials (printed at end of seed) ─────────────────────────────────
DEMO_USERS = [
    {
        "email": "admin@acme-corp.demo",
        "password": "Admin@123!",
        "full_name": "Sarah Chen",
        "role": "admin",
    },
    {
        "email": "analyst@acme-corp.demo",
        "password": "Analyst@123!",
        "full_name": "David Okafor",
        "role": "analyst",
    },
    {
        "email": "exec@acme-corp.demo",
        "password": "Exec@123!",
        "full_name": "Maria Rodriguez",
        "role": "exec_committee",
    },
]


async def seed():
    from app.database import Base, init_db
    from app.models.organization import Organization
    from app.models.user import User, UserRole
    from app.models.audit import Audit, AuditStatus
    from app.models.performance_review import PerformanceReview
    from app.models.salary_record import SalaryRecord, PromotionRecord
    from app.models.job_standard import JobStandard
    from app.models.audit_log import AuditLog

    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    SessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    print("🌱 PayParity seed starting...")

    async with engine.begin() as conn:
        # Enable pgvector (removed for sqlite)
        # await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        # Create all tables
        await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as db:
        # ── 1. Create organization ─────────────────────────────────────────────
        org = Organization(
            id=uuid.uuid4(),
            name="ACME Corporation",
            slug="acme-corp",
            industry="Technology",
            country="US",
            privacy_epsilon_budget=10.0,
            privacy_delta=1e-5,
            guardrails_config={
                "max_epsilon_per_audit": 2.0,
                "require_hitl_for_all_recommendations": True,
                "min_sample_size_for_analysis": 5,
                "anonymization_strictness": "high",
            },
        )
        db.add(org)
        await db.flush()
        print(f"  ✅ Organization created: {org.name} (id={org.id})")

        # ── 2. Create users ────────────────────────────────────────────────────
        user_ids = {}
        for user_data in DEMO_USERS:
            user = User(
                id=uuid.uuid4(),
                organization_id=org.id,
                email=user_data["email"],
                hashed_password=pwd_context.hash(user_data["password"]),
                full_name=user_data["full_name"],
                role=UserRole(user_data["role"]),
            )
            db.add(user)
            user_ids[user_data["role"]] = user.id
        await db.flush()
        print(f"  ✅ {len(DEMO_USERS)} users created")

        # ── 3. Create audit ────────────────────────────────────────────────────
        audit = Audit(
            id=uuid.uuid4(),
            organization_id=org.id,
            created_by_id=user_ids["analyst"],
            name="ACME Q4 2024 Pay Equity Audit",
            description=(
                "Comprehensive pay equity audit covering Engineering, Product, "
                "Sales, and Data Science departments for H1 2024."
            ),
            status=AuditStatus.DRAFT,
            allocated_epsilon=1.0,
            audit_config={
                "departments": ["ENGINEERING", "PRODUCT", "SALES", "DATA_SCIENCE"],
                "review_period": "2024-H1",
                "budget_constraint": 750000,
            },
        )
        db.add(audit)
        await db.flush()
        print(f"  ✅ Audit created: {audit.name} (id={audit.id})")

        # ── 4. Load sample performance reviews ────────────────────────────────
        reviews_data = json.loads((SAMPLE_DATA_DIR / "reviews.json").read_text())
        for r in reviews_data:
            review = PerformanceReview(
                organization_id=org.id,
                audit_id=audit.id,
                employee_token=r["employee_token"],
                manager_token=r.get("manager_token"),
                review_period=r.get("review_period", "2024-H1"),
                department_code=r.get("department_code"),
                role_level=r.get("role_level"),
                tenure_band=r.get("tenure_band"),
                location_region=r.get("location_region"),
                gender_group=r.get("gender_group"),
                ethnicity_group=r.get("ethnicity_group"),
                review_text=r["review_text"],
                performance_rating=r.get("performance_rating"),
                is_anonymized_verified=True,
            )
            db.add(review)
        print(f"  ✅ {len(reviews_data)} performance reviews loaded")

        # ── 5. Load salary matrix ──────────────────────────────────────────────
        salary_data = json.loads((SAMPLE_DATA_DIR / "salary_matrix.json").read_text())
        for s in salary_data:
            rec = SalaryRecord(
                organization_id=org.id,
                audit_id=audit.id,
                employee_token=s["employee_token"],
                record_year=s.get("record_year", 2024),
                base_salary=s["base_salary"],
                total_compensation=s.get("total_compensation"),
                job_family_code=s.get("job_family_code"),
                role_level=s.get("role_level"),
                department_code=s.get("department_code"),
                location_region=s.get("location_region"),
                tenure_years=s.get("tenure_years"),
                performance_rating=s.get("performance_rating"),
                gender_group=s.get("gender_group"),
                ethnicity_group=s.get("ethnicity_group"),
                market_p50_salary=s.get("market_p50"),
                is_anonymized_verified=True,
            )
            db.add(rec)

        # Promotion records
        promotion_data = [
            {"employee_token": "EMP_A002", "promotion_year": 2023, "from_level": "L3",
             "to_level": "L4", "time_in_level_months": 18, "gender_group": "G2", "ethnicity_group": "E1"},
            {"employee_token": "EMP_A006", "promotion_year": 2023, "from_level": "L4",
             "to_level": "L5", "time_in_level_months": 22, "gender_group": "G2", "ethnicity_group": "E1"},
            {"employee_token": "EMP_B002", "promotion_year": 2024, "from_level": "L2",
             "to_level": "L3", "time_in_level_months": 20, "gender_group": "G2", "ethnicity_group": "E1"},
        ]
        for p in promotion_data:
            promo = PromotionRecord(
                organization_id=org.id,
                audit_id=audit.id,
                employee_token=p["employee_token"],
                promotion_year=p["promotion_year"],
                from_level=p.get("from_level"),
                to_level=p.get("to_level"),
                time_in_level_months=p.get("time_in_level_months"),
                gender_group=p.get("gender_group"),
                ethnicity_group=p.get("ethnicity_group"),
                is_anonymized_verified=True,
            )
            db.add(promo)

        print(f"  ✅ {len(salary_data)} salary records + {len(promotion_data)} promotion records loaded")

        # ── 6. Job architecture standards (pgvector) ──────────────────────────
        job_standards = [
            JobStandard(
                organization_id=org.id,
                job_family="Software Engineering",
                job_level="L4",
                job_title="Senior Software Engineer",
                industry="Technology",
                responsibilities="Lead design of complex systems, mentor junior engineers, drive technical decisions",
                competencies="System design, technical leadership, cross-functional collaboration",
                level_expectations="Independently leads projects, influences engineering culture",
                market_p25_salary=160000,
                market_p50_salary=195000,
                market_p75_salary=235000,
            ),
            JobStandard(
                organization_id=org.id,
                job_family="Product Management",
                job_level="L5",
                job_title="Staff Product Manager",
                industry="Technology",
                responsibilities="Define product vision, lead cross-functional teams, drive revenue impact",
                competencies="Strategic thinking, data-driven decisions, stakeholder alignment",
                level_expectations="Owns P&L for a product area, drives company-level impact",
                market_p25_salary=195000,
                market_p50_salary=240000,
                market_p75_salary=290000,
            ),
        ]
        for js in job_standards:
            db.add(js)
        print(f"  ✅ {len(job_standards)} job standards loaded")

        # ── 7. Audit log entries ───────────────────────────────────────────────
        log_entries = [
            AuditLog(
                organization_id=org.id,
                audit_id=audit.id,
                user_id=user_ids["analyst"],
                event_type="audit.created",
                description="Audit created by analyst",
                event_data={"audit_name": audit.name},
            ),
        ]
        for log in log_entries:
            db.add(log)

        await db.commit()

    print("\n🎉 Seed complete! Demo credentials:")
    print("=" * 55)
    for u in DEMO_USERS:
        print(f"  [{u['role']:15}] {u['email']}  /  {u['password']}")
    print("=" * 55)
    print(f"\n  Audit ID: {audit.id}")
    print(f"  Org ID:   {org.id}")
    print(f"\n  Start audit swarm:")
    print(f"  POST /api/v1/audits/{audit.id}/start")
    print("\n  API Docs: http://localhost:8000/docs")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())

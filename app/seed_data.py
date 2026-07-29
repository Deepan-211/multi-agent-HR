"""
PayParity — Deterministic Synthetic Dataset Generator
Generates 400 employees with calibrated bias patterns.
Called automatically on app startup if the database is empty.
"""
import uuid
import random
import hashlib
from datetime import datetime, timezone
from typing import List, Dict, Any

from sqlalchemy.ext.asyncio import AsyncSession

# Deterministic seed for reproducibility
_RNG = random.Random(42)

# ── Organization & User constants ───────────────────────────────────────────
ORG_ID = uuid.UUID("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")
ORG_NAME = "ACME Corporation"
ORG_SLUG = "acme-corp"

ADMIN_USER_ID = uuid.UUID("11111111-2222-3333-4444-555555555555")
ADMIN_EMAIL = "admin@acme-corp.demo"
ADMIN_PASSWORD_HASH = "$2b$12$LJ3m7x8z1z1z1z1z1z1z1uAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"

# ── Department / Level configuration ────────────────────────────────────────
DEPARTMENTS = ["ENGINEERING", "PRODUCT", "SALES", "DATA_SCIENCE"]
LEVELS = ["L3", "L4", "L5", "L6"]
REGIONS = ["US-WEST", "US-EAST", "US-CENTRAL", "EMEA"]

# Base salaries by level (market median)
LEVEL_BASE_SALARY = {
    "L3": 120000, "L4": 160000, "L5": 210000, "L6": 270000,
}

# Gender pay gap multipliers (G1 = female-coded group, paid less)
# This produces ~14.2% unadjusted gap when averaged across all levels
GENDER_SALARY_MULTIPLIER = {
    "G1": 0.87,   # ~13-15% below market
    "G2": 1.01,   # at or slightly above market
}

# ── Biased review phrase banks ──────────────────────────────────────────────
# G1 (female-coded) get personality-based criticism; G2 get agentic praise
BIASED_PHRASES_G1 = [
    "can be abrasive when presenting ideas",
    "needs to work on her communication style",
    "lacks executive presence",
    "overly emotional in high-stress situations",
    "sometimes too aggressive in meetings",
    "needs to be more accommodating",
    "can be bossy with junior team members",
    "struggles to assert herself confidently",
    "a natural nurturer for the team",
    "pleasant to have around",
    "should be more decisive",
    "too direct with stakeholders",
    "surprisingly strong on the technical side",
    "needs to manage up better",
    "helpful and communal but lacks independence",
    "needs to develop more confidence",
    "good at collaborating but not leading",
    "organized and detail-oriented but not innovative",
    "supportive but needs to take more ownership",
    "works well within structure but lacks strategic vision",
]

AGENTIC_PHRASES_G2 = [
    "drives results with confidence and decisiveness",
    "outstanding strategic thinker",
    "demonstrates strong executive presence",
    "a decisive leader who commands respect",
    "independently championed the new approach",
    "excellent technical leader with high impact",
    "confidently handles pressure and ambiguity",
    "strong negotiation and leadership skills",
    "clear candidate for promotion",
    "exceptional vision and execution",
    "fiercely defends his architecture decisions",
    "direct communication style that resonates",
    "independently closed major accounts",
    "strong pipeline management and quota attainment",
    "highly innovative with strategic vision",
    "excellent at communicating to leadership",
    "high-impact individual ready for next level",
    "drives the team to deliver ahead of schedule",
    "outstanding performance across all dimensions",
    "remarkable clarity and strategic depth",
]

# Neutral phrases used for both groups
NEUTRAL_PHRASES = [
    "solid contributor this cycle",
    "met all deliverables on time",
    "good cross-functional collaboration",
    "reliable team member",
    "demonstrates technical competence",
    "consistent performance throughout the quarter",
    "effective at sprint planning and execution",
    "shows growth in domain expertise",
    "contributes positively to team culture",
    "meets expectations for current level",
]


def _make_uuid(seed_str: str) -> uuid.UUID:
    """Deterministic UUID from a string seed."""
    h = hashlib.md5(seed_str.encode()).hexdigest()
    return uuid.UUID(h)


def _generate_review_text(gender_group: str, emp_token: str, dept: str) -> str:
    """Generate a realistic performance review with calibrated bias."""
    rng = random.Random(emp_token)  # deterministic per employee

    paragraphs = []

    if gender_group == "G1":
        # Mix neutral with biased phrases
        n_biased = rng.randint(2, 4)
        n_neutral = rng.randint(1, 3)
        biased = rng.sample(BIASED_PHRASES_G1, min(n_biased, len(BIASED_PHRASES_G1)))
        neutral = rng.sample(NEUTRAL_PHRASES, min(n_neutral, len(NEUTRAL_PHRASES)))
        phrases = biased + neutral
        rng.shuffle(phrases)
        pronoun = "She"
    else:
        # Agentic praise with neutral
        n_agentic = rng.randint(2, 4)
        n_neutral = rng.randint(1, 2)
        agentic = rng.sample(AGENTIC_PHRASES_G2, min(n_agentic, len(AGENTIC_PHRASES_G2)))
        neutral = rng.sample(NEUTRAL_PHRASES, min(n_neutral, len(NEUTRAL_PHRASES)))
        phrases = agentic + neutral
        rng.shuffle(phrases)
        pronoun = "He"

    # Build review paragraphs
    sentences = []
    for phrase in phrases:
        if rng.random() < 0.5:
            sentences.append(f"{pronoun} {phrase}.")
        else:
            sentences.append(f"{phrase.capitalize()}.")

    # Add a department-specific opener
    openers = {
        "ENGINEERING": f"In this review period, {pronoun.lower()} contributed to multiple engineering initiatives.",
        "PRODUCT": f"This cycle, {pronoun.lower()} drove product strategy across key business areas.",
        "SALES": f"Strong quarter for the sales function. {pronoun} engaged with enterprise accounts.",
        "DATA_SCIENCE": f"The data science team benefited from {pronoun.lower()}r analytical contributions.",
    }
    opening = openers.get(dept, f"{pronoun} performed well this review period.")

    return opening + " " + " ".join(sentences)


def _generate_performance_rating(gender_group: str, level: str, emp_token: str) -> float:
    """G1 gets slightly lower ratings despite similar work (the bias we're detecting)."""
    rng = random.Random(emp_token + "_rating")
    base = {"L3": 3.5, "L4": 3.8, "L5": 4.0, "L6": 4.2}[level]

    if gender_group == "G1":
        return round(base + rng.uniform(-0.5, 0.3), 1)  # skewed lower
    else:
        return round(base + rng.uniform(-0.2, 0.7), 1)  # skewed higher


def generate_employees(n: int = 400) -> Dict[str, List[Dict[str, Any]]]:
    """
    Generate n synthetic employees with reviews, salaries, and promotions.
    Returns dict with keys: employees, reviews, salaries, promotions
    """
    rng = _RNG

    reviews = []
    salaries = []
    promotions = []

    # Distribution: 60% G2, 40% G1 (reflects typical tech workforce skew)
    # But we need enough G1 to get 412 biased phrases
    employees_per_dept = n // len(DEPARTMENTS)

    emp_index = 0
    total_biased_phrases = 0

    for dept in DEPARTMENTS:
        for i in range(employees_per_dept):
            emp_index += 1
            emp_token = f"EMP_{emp_index:04d}"

            # Gender distribution: ~45% G1, ~55% G2
            gender_group = "G1" if rng.random() < 0.45 else "G2"

            # Level distribution weighted toward L3-L4
            level_weights = {"L3": 0.35, "L4": 0.35, "L5": 0.20, "L6": 0.10}
            level = rng.choices(list(level_weights.keys()),
                                weights=list(level_weights.values()))[0]

            region = rng.choice(REGIONS)
            tenure = round(rng.uniform(1.0, 12.0), 1)
            rating = _generate_performance_rating(gender_group, level, emp_token)

            # Salary with gender gap built in
            base = LEVEL_BASE_SALARY[level]
            multiplier = GENDER_SALARY_MULTIPLIER[gender_group]
            noise = rng.uniform(0.92, 1.08)
            salary = round(base * multiplier * noise)
            total_comp = round(salary * rng.uniform(1.15, 1.35))

            # Generate review
            review_text = _generate_review_text(gender_group, emp_token, dept)

            # Count biased phrases in this review
            if gender_group == "G1":
                for phrase in BIASED_PHRASES_G1:
                    if phrase in review_text.lower():
                        total_biased_phrases += 1

            review_id = _make_uuid(f"review_{emp_token}")
            reviews.append({
                "id": str(review_id),
                "employee_token": emp_token,
                "manager_token": f"MGR_{dept[:3]}_{(i // 10) + 1:02d}",
                "review_period": "2024-H1",
                "department_code": dept,
                "role_level": level,
                "tenure_band": f"{int(tenure)}-{int(tenure)+2}y",
                "location_region": region,
                "gender_group": gender_group,
                "ethnicity_group": rng.choice(["E1", "E2", "E3", "E4"]),
                "review_text": review_text,
                "performance_rating": rating,
            })

            salaries.append({
                "id": str(_make_uuid(f"salary_{emp_token}")),
                "employee_token": emp_token,
                "record_year": 2024,
                "base_salary": salary,
                "total_compensation": total_comp,
                "job_family_code": dept.lower(),
                "role_level": level,
                "department_code": dept,
                "location_region": region,
                "tenure_years": tenure,
                "performance_rating": rating,
                "gender_group": gender_group,
                "ethnicity_group": rng.choice(["E1", "E2", "E3", "E4"]),
            })

            # Promotions: G2 promoted more often (bias)
            promo_chance = 0.35 if gender_group == "G2" else 0.20
            if level != "L6" and rng.random() < promo_chance:
                next_level = {"L3": "L4", "L4": "L5", "L5": "L6"}[level]
                time_in_level = rng.randint(12, 36)
                if gender_group == "G1":
                    time_in_level = int(time_in_level * 1.3)  # G1 waits longer

                promotions.append({
                    "id": str(_make_uuid(f"promo_{emp_token}")),
                    "employee_token": emp_token,
                    "promotion_year": rng.choice([2023, 2024]),
                    "from_level": level,
                    "to_level": next_level,
                    "time_in_level_months": time_in_level,
                    "department_code": dept,
                    "gender_group": gender_group,
                    "ethnicity_group": rng.choice(["E1", "E2", "E3", "E4"]),
                })

    return {
        "reviews": reviews,
        "salaries": salaries,
        "promotions": promotions,
        "stats": {
            "total_employees": len(salaries),
            "total_reviews": len(reviews),
            "total_promotions": len(promotions),
            "estimated_biased_phrases": total_biased_phrases,
        }
    }


async def seed_database(session: AsyncSession) -> Dict[str, Any]:
    """
    Seed the database with synthetic data.
    Returns summary statistics.
    """
    from app.models.organization import Organization
    from app.models.user import User, UserRole
    from app.models.audit import Audit, AuditStatus
    from app.models.performance_review import PerformanceReview
    from app.models.salary_record import SalaryRecord, PromotionRecord

    # Check if already seeded
    from sqlalchemy import select, func
    result = await session.execute(select(func.count()).select_from(Organization))
    org_count = result.scalar()
    if org_count and org_count > 0:
        # Already seeded - return existing audit id
        audit_result = await session.execute(select(Audit.id).limit(1))
        existing_id = audit_result.scalar()
        return {"already_seeded": True, "audit_id": str(existing_id) if existing_id else None}

    print("[*] Seeding PayParity database with 400 synthetic employees...")

    # 1. Create organization
    org = Organization(
        id=ORG_ID,
        name=ORG_NAME,
        slug=ORG_SLUG,
        industry="Technology",
        country="US",
        privacy_epsilon_budget=10.0,
        privacy_delta=1e-5,
        guardrails_config={
            "max_epsilon_per_audit": 2.0,
            "require_hitl_for_all_recommendations": True,
            "min_sample_size_for_analysis": 5,
        },
    )
    session.add(org)

    # 2. Create admin user (for HITL)
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    admin = User(
        id=ADMIN_USER_ID,
        organization_id=ORG_ID,
        email=ADMIN_EMAIL,
        hashed_password=pwd_context.hash("Admin@123!"),
        full_name="Sarah Chen",
        role=UserRole.ADMIN,
    )
    session.add(admin)
    await session.flush()

    # 3. Generate synthetic data
    data = generate_employees(400)

    # 4. Insert performance reviews
    for r in data["reviews"]:
        review = PerformanceReview(
            id=uuid.UUID(r["id"]),
            organization_id=ORG_ID,
            employee_token=r["employee_token"],
            manager_token=r["manager_token"],
            review_period=r["review_period"],
            department_code=r["department_code"],
            role_level=r["role_level"],
            tenure_band=r["tenure_band"],
            location_region=r["location_region"],
            gender_group=r["gender_group"],
            ethnicity_group=r["ethnicity_group"],
            review_text=r["review_text"],
            performance_rating=r["performance_rating"],
            is_anonymized_verified=True,
        )
        session.add(review)

    # 5. Insert salary records
    for s in data["salaries"]:
        rec = SalaryRecord(
            id=uuid.UUID(s["id"]),
            organization_id=ORG_ID,
            employee_token=s["employee_token"],
            record_year=s["record_year"],
            base_salary=s["base_salary"],
            total_compensation=s["total_compensation"],
            job_family_code=s["job_family_code"],
            role_level=s["role_level"],
            department_code=s["department_code"],
            location_region=s["location_region"],
            tenure_years=s["tenure_years"],
            performance_rating=s["performance_rating"],
            gender_group=s["gender_group"],
            ethnicity_group=s["ethnicity_group"],
            is_anonymized_verified=True,
        )
        session.add(rec)

    # 6. Insert promotion records
    for p in data["promotions"]:
        promo = PromotionRecord(
            id=uuid.UUID(p["id"]),
            organization_id=ORG_ID,
            employee_token=p["employee_token"],
            promotion_year=p["promotion_year"],
            from_level=p["from_level"],
            to_level=p["to_level"],
            time_in_level_months=p["time_in_level_months"],
            department_code=p["department_code"],
            gender_group=p["gender_group"],
            ethnicity_group=p["ethnicity_group"],
            is_anonymized_verified=True,
        )
        session.add(promo)

    await session.commit()

    stats = data["stats"]
    print(f"  [OK] {stats['total_employees']} employees")
    print(f"  [OK] {stats['total_reviews']} performance reviews")
    print(f"  [OK] {stats['total_promotions']} promotion records")
    print(f"  [OK] ~{stats['estimated_biased_phrases']} biased phrase instances")
    print("[DONE] Seed complete!")

    return {"already_seeded": False, **stats}

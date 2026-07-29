# PayParity — Autonomous Enterprise Pay & Promotion Bias Audit Swarm

> **Privacy-preserving, multi-agent HR analytics platform** that detects gender/racial pay gaps, identifies biased manager feedback, and proposes objective equity-adjusted compensation frameworks — under strict differential privacy guarantees and a mandatory human-in-the-loop review gate.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                      FastAPI REST + SSE API                          │
│              JWT + RBAC │ WebSocket/SSE Streaming                    │
├──────────────────────────────────────────────────────────┬──────────┤
│         LangGraph Multi-Agent Swarm (Celery Worker)      │  Privacy │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │   Layer  │
│  │ Review Text  │→ │Compensation  │→ │ Counterfactual│  │  DP (ε)  │
│  │ Parser Agent │  │Analytics Agt │  │  Audit Agent  │  │  Budget  │
│  └──────────────┘  └──────────────┘  └───────────────┘  │  Track   │
│                              ↓                            │          │
│                   ┌──────────────────┐                   │          │
│                   │ Equity Framework │                   │          │
│                   │     Agent        │                   │          │
│                   └──────────────────┘                   │          │
│                              ↓                            │          │
│              ┌───────────────────────────────┐           │          │
│              │  HITL Gate (Exec Committee)    │           │          │
│              │  Approve / Reject / Changes    │           │          │
│              └───────────────────────────────┘           │          │
├──────────────────────────────────────────────────────────┴──────────┤
│           PostgreSQL + pgvector │ Redis (Celery)                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### 1. Prerequisites
- Docker + Docker Compose
- Python 3.11+
- (Optional) OpenAI API key — runs in **mock mode** without it

### 2. Start with Docker (recommended)

```bash
# Copy environment template
cp .env.example .env

# Optional: add your OpenAI key for live LLM mode
# Leave AGENT_MODE=mock to run without any API key

# Start all services
docker-compose up -d

# Check all services are healthy
docker-compose ps
```

### 3. Run without Docker (local)

```bash
# Install dependencies
pip install -r requirements.txt

# Start PostgreSQL and Redis locally, then:
cp .env.example .env
# Edit .env with your local DB/Redis URLs

# Initialize database
alembic upgrade head

# Seed demo data
python -m app.seed.seed

# Start API server
uvicorn app.main:app --reload --port 8000

# Start Celery worker (separate terminal)
celery -A app.workers.celery_app worker --loglevel=info
```

### 4. Access the API

| Resource | URL |
|---|---|
| API Docs (Swagger) | http://localhost:8000/docs |
| ReDoc | http://localhost:8000/redoc |
| Health Check | http://localhost:8000/health |

---

## Running the Demo End-to-End

### Step 1: Seed the database
```bash
python -m app.seed.seed
```
This creates:
- **Organization**: ACME Corporation
- **3 users**: admin, analyst, exec_committee
- **1 audit** in DRAFT state
- **10 performance reviews** with embedded bias patterns
- **10 salary records** with measurable pay gaps
- **Job architecture standards** in pgvector

### Step 2: Log in as analyst
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -d "username=analyst@acme-corp.demo&password=Analyst@123!"
```
Copy the `access_token` from the response.

### Step 3: Start the agent swarm
```bash
# Replace {AUDIT_ID} with the ID printed by the seed script
curl -X POST http://localhost:8000/api/v1/audits/{AUDIT_ID}/start \
  -H "Authorization: Bearer {TOKEN}"
```

### Step 4: Watch live agent activity (SSE)
```bash
curl -N http://localhost:8000/api/v1/agents/audit/{AUDIT_ID}/stream \
  -H "Authorization: Bearer {TOKEN}"
```

### Step 5: Review results
```bash
# Bias flags
curl http://localhost:8000/api/v1/bias-flags/audit/{AUDIT_ID} \
  -H "Authorization: Bearer {TOKEN}"

# Pay gap analysis (in audit summary)
curl http://localhost:8000/api/v1/audits/{AUDIT_ID} \
  -H "Authorization: Bearer {TOKEN}"

# Counterfactual experiments
curl http://localhost:8000/api/v1/counterfactuals/audit/{AUDIT_ID} \
  -H "Authorization: Bearer {TOKEN}"

# Equity recommendations (pending HITL)
curl http://localhost:8000/api/v1/recommendations/audit/{AUDIT_ID} \
  -H "Authorization: Bearer {TOKEN}"
```

### Step 6: HITL review (exec committee only)
```bash
# Log in as exec
curl -X POST http://localhost:8000/api/v1/auth/login \
  -d "username=exec@acme-corp.demo&password=Exec@123!"

# View pending reviews
curl http://localhost:8000/api/v1/hitl/pending \
  -H "Authorization: Bearer {EXEC_TOKEN}"

# Approve a recommendation (mandatory comment required)
curl -X POST http://localhost:8000/api/v1/hitl/decide \
  -H "Authorization: Bearer {EXEC_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "recommendation_id": "{REC_ID}",
    "decision": "approved",
    "comment": "Statistical evidence is compelling. Adjustment is within budget and legally compliant. Proceeding with implementation."
  }'
```

### Step 7: Observability dashboard
```bash
curl http://localhost:8000/api/v1/observability/dashboard \
  -H "Authorization: Bearer {TOKEN}"

curl http://localhost:8000/api/v1/privacy/budget \
  -H "Authorization: Bearer {TOKEN}"
```

---

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@acme-corp.demo | Admin@123! |
| Analyst | analyst@acme-corp.demo | Analyst@123! |
| Exec Committee | exec@acme-corp.demo | Exec@123! |

---

## Hard Guarantees (Non-Negotiable)

| Guarantee | Implementation |
|---|---|
| **No PII processed** | Anonymization gate on upload: regex + heuristic scan rejects any file with detected PII patterns |
| **DP on all outputs** | Laplace/Gaussian noise injected on every numerical output; ε consumed and tracked |
| **HITL required** | `hitl_required=True` hard-coded on every recommendation; finalization blocked without exec approval |
| **ε budget enforced** | `PrivacyBudgetTracker.consume()` throws `PrivacyBudgetExhaustedError` before any over-budget query |
| **Immutable audit trail** | `AuditLog` table has no UPDATE/DELETE permissions in production; all HITL decisions stored as new records |
| **Role enforcement** | JWT + RBAC guards on every endpoint; `require_exec` blocks non-exec HITL decisions |

---

## Running Tests

```bash
# Install test dependencies (included in requirements.txt)
pip install pytest pytest-asyncio pytest-cov

# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=app --cov-report=html

# Run specific test categories
pytest tests/test_privacy.py -v      # DP mechanisms
pytest tests/test_hitl.py -v         # HITL guardrails
pytest tests/test_agents.py -v       # Agent unit tests
pytest tests/test_api.py -v          # API integration
```

---

## Configuration Reference

| Variable | Default | Description |
|---|---|---|
| `AGENT_MODE` | `mock` | `mock` = no API key needed; `live` = uses OpenAI |
| `DEFAULT_PRIVACY_EPSILON` | `1.0` | Default ε per audit |
| `MAX_PRIVACY_EPSILON` | `10.0` | Hard system cap |
| `OPENAI_API_KEY` | `""` | Required only if `AGENT_MODE=live` |
| `SECRET_KEY` | (change me) | JWT signing key |

---

## Project Structure

```
payparity/
├── app/
│   ├── main.py                  # FastAPI app + router registration
│   ├── config.py                # All settings (pydantic-settings)
│   ├── database.py              # Async SQLAlchemy engine
│   ├── api/                     # 12 API routers
│   ├── agents/                  # 4 specialist agents + LangGraph orchestrator
│   ├── tools/                   # DP tools, text analysis, statistical, compliance KB
│   ├── models/                  # 14 SQLAlchemy ORM models
│   ├── core/                    # Auth, exceptions, logging, privacy engine
│   ├── workers/                 # Celery worker tasks
│   └── seed/                    # Demo data + seed script
├── tests/                       # Unit + integration tests
├── alembic/                     # DB migrations
├── docker-compose.yml
├── requirements.txt
└── README.md
```

---

## API Reference Summary

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/auth/login` | POST | Get JWT token |
| `/api/v1/auth/register` | POST | Register user |
| `/api/v1/audits/` | POST/GET | Create/list audits |
| `/api/v1/audits/{id}/start` | POST | Launch agent swarm |
| `/api/v1/datasets/reviews/{audit_id}` | POST | Upload anonymized reviews |
| `/api/v1/datasets/salary/{audit_id}` | POST | Upload salary matrix |
| `/api/v1/agents/audit/{id}` | GET | Get agent reasoning traces |
| `/api/v1/agents/audit/{id}/stream` | GET (SSE) | Live agent activity stream |
| `/api/v1/bias-flags/audit/{id}` | GET | Get detected bias flags |
| `/api/v1/counterfactuals/audit/{id}` | GET | Get counterfactual experiments |
| `/api/v1/recommendations/audit/{id}` | GET | Get equity recommendations |
| `/api/v1/hitl/pending` | GET | View pending HITL queue |
| `/api/v1/hitl/decide` | POST | Submit HITL decision |
| `/api/v1/hitl/history/{id}` | GET | Immutable decision audit trail |
| `/api/v1/observability/dashboard` | GET | Live dashboard summary |
| `/api/v1/observability/metrics` | GET | Time-series metrics |
| `/api/v1/observability/live` | GET (SSE) | Live metrics stream |
| `/api/v1/privacy/budget` | GET | ε budget status |
| `/api/v1/admin/guardrails` | GET/PUT | Configure system guardrails |

---

## Technical Stack

| Component | Technology |
|---|---|
| API Framework | FastAPI + Uvicorn |
| Agent Orchestration | LangGraph |
| Database | PostgreSQL 16 + pgvector |
| ORM + Migrations | SQLAlchemy 2.0 (async) + Alembic |
| Background Jobs | Celery + Redis |
| Differential Privacy | Custom Laplace/Gaussian + diffprivlib |
| Authentication | JWT (python-jose) + bcrypt |
| Real-time | SSE (sse-starlette) + WebSocket |
| Statistical | scipy, scikit-learn, statsmodels, pandas |
| Logging | structlog (JSON in prod, pretty in dev) |
| Testing | pytest + pytest-asyncio |

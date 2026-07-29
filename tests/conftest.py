"""
PayParity — Test Configuration & Fixtures
"""
import asyncio
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.main import app
from app.database import Base, get_db
from app.core.auth import create_access_token

# ── In-memory SQLite for tests ─────────────────────────────────────────────────
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def db_session():
    """Create a fresh in-memory DB per test."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def client(db_session):
    """FastAPI test client with overridden DB."""
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
def admin_token():
    return create_access_token(
        subject="admin-user-id",
        org_id="11111111-1111-1111-1111-111111111111",
        role="admin",
    )


@pytest.fixture
def analyst_token():
    return create_access_token(
        subject="analyst-user-id",
        org_id="11111111-1111-1111-1111-111111111111",
        role="analyst",
    )


@pytest.fixture
def exec_token():
    return create_access_token(
        subject="exec-user-id",
        org_id="11111111-1111-1111-1111-111111111111",
        role="exec_committee",
    )

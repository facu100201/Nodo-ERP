import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import get_db, SessionLocal


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

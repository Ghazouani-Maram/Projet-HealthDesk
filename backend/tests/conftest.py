import os
import shutil
from pathlib import Path

# Environnement de test isolé, défini AVANT l'import de l'application
ROOT = Path(__file__).resolve().parent
os.environ["DATABASE_URL"] = f"sqlite:///{ROOT / 'test.db'}"
os.environ["UPLOAD_DIR"] = str(ROOT / "test_uploads")
os.environ["SEED_DEMO_DATA"] = "true"
(ROOT / "test.db").unlink(missing_ok=True)
shutil.rmtree(ROOT / "test_uploads", ignore_errors=True)

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


def _login(client, email, password):
    r = client.post("/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


@pytest.fixture(scope="session")
def admin(client):
    return _login(client, "admin@demo.tn", "Admin123!")


@pytest.fixture(scope="session")
def doctor(client):
    return _login(client, "medecin@demo.tn", "Demo1234!")


@pytest.fixture(scope="session")
def patient(client):
    return _login(client, "patient@demo.tn", "Demo1234!")


@pytest.fixture(scope="session")
def patient2(client):
    return _login(client, "o.bouzid@demo.tn", "Demo1234!")

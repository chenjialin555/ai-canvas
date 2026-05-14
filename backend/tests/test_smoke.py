from __future__ import annotations

from starlette.testclient import TestClient

from backend.app.main import app


def test_health() -> None:
    client = TestClient(app)
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body.get("ok") is True


def test_models_shape() -> None:
    client = TestClient(app)
    r = client.get("/api/models")
    assert r.status_code == 200
    data = r.json()
    assert "banana" in data
    assert "models" in data["banana"]

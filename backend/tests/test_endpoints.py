from unittest.mock import patch
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_get_roles_returns_list():
    with patch("data.skillsfuture_loader.skillsfuture.get_roles", return_value=["Data Analyst", "Software Engineer"]):
        response = client.get("/api/roles")
    assert response.status_code == 200
    data = response.json()
    assert "roles" in data
    assert isinstance(data["roles"], list)

def test_get_roles_filter():
    with patch("data.skillsfuture_loader.skillsfuture.get_roles", return_value=["Data Analyst"]):
        response = client.get("/api/roles?q=data")
    assert response.status_code == 200
    assert len(response.json()["roles"]) == 1

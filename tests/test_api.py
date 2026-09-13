import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_system_health_endpoint():
    response = client.get("/api/system/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "OPERATIONAL"
    assert "database" in data["components"]
    assert "ai_engine" in data["components"]

def test_anomalies_summary_endpoint():
    response = client.get("/api/anomalies/summary")
    assert response.status_code == 200
    data = response.json()
    assert "total_projects" in data
    assert "priority_breakdown" in data
    assert "financials" in data

def test_auth_login_endpoint():
    response = client.post(
        "/api/auth/token",
        data={"username": "auditor", "password": "auditor123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "AUDITOR"

def test_projects_list_endpoint():
    response = client.get("/api/projects?page=1&page_size=10")
    assert response.status_code == 200
    data = response.json()
    assert "total" in data
    assert "items" in data
    assert isinstance(data["items"], list)

def test_analysis_runs_endpoint():
    response = client.get("/api/analysis/runs")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_evidence_gap_endpoint():
    # Test with first project in DB or fallback
    p_resp = client.get("/api/projects?page=1&page_size=1")
    if p_resp.status_code == 200 and p_resp.json().get("items"):
        pid = p_resp.json()["items"][0]["project_id"]
        response = client.get(f"/api/projects/{pid}/evidence-gap")
        assert response.status_code == 200
        data = response.json()
        assert "coverage_percentage" in data
        assert "gap_status" in data
        assert "recommendation" in data

def test_case_history_and_event_endpoint():
    # Test with first case in DB
    cases_resp = client.get("/api/investigations?limit=1")
    if cases_resp.status_code == 200 and len(cases_resp.json()) > 0:
        cid = cases_resp.json()[0]["case_id"]
        # Post event
        evt_resp = client.post(
            f"/api/investigations/cases/{cid}/review-event",
            json={"action": "AUDITOR_VERIFICATION_REQUEST", "username": "auditor", "details": {"method": "field_visit"}}
        )
        assert evt_resp.status_code == 200
        # Check history
        hist_resp = client.get(f"/api/investigations/cases/{cid}/history")
        assert hist_resp.status_code == 200
        assert len(hist_resp.json()) > 0


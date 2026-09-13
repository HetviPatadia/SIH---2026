import os
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_submit_grievance_success():
    # 1. Fetch a valid public project ID from DB
    projects_resp = client.get("/api/public/projects?page=1&page_size=1")
    assert projects_resp.status_code == 200
    items = projects_resp.json().get("items", [])
    assert len(items) > 0, "No public projects found in DB"
    
    project_id = items[0]["project_id"]
    project_title = items[0].get("title") or items[0].get("description") or "Test Project"

    # 2. Submit grievance with valid payload
    payload = {
        "project_id": project_id,
        "project_title": project_title,
        "company_name": "Public Works Department (PWD)",
        "contractor_name": "Apex Civil Infra Ltd",
        "issue_type": "quality",
        "description": "The asphalt layer laid on the road is already eroding after monsoon rains and lacks proper leveling.",
        "citizen_name": "Ramesh Kumar",
        "citizen_contact": "ramesh@example.com"
    }

    response = client.post("/api/public/grievances", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "ticket_number" in data
    assert data["ticket_number"].startswith("GRV-")
    assert data["status"] == "Received"
    assert "successfully" in data["message"].lower()

    # 3. Verify track endpoint
    ticket_no = data["ticket_number"]
    track_resp = client.get(f"/api/public/grievances/track/{ticket_no}")
    assert track_resp.status_code == 200
    track_data = track_resp.json()
    assert track_data["ticket_number"] == ticket_no
    assert track_data["project_id"] == project_id
    assert track_data["status"] == "Received"
    assert "Received" in track_data["status_description"]

    # 4. Verify CSV ledger exists and contains ticket_number
    csv_path = os.path.join("data", "demo_dataset", "citizen_complaints_log.csv")
    assert os.path.exists(csv_path), "CSV ledger was not created"
    with open(csv_path, "r", encoding="utf-8") as f:
        content = f.read()
        assert ticket_no in content, f"Ticket number {ticket_no} not found in CSV ledger"

def test_submit_grievance_nonexistent_project():
    payload = {
        "project_id": "INVALID-PROJECT-ID-999999",
        "project_title": "Non-existent Project",
        "company_name": "Test Company",
        "contractor_name": "Test Contractor",
        "issue_type": "delay",
        "description": "Work has not started at all despite allocation.",
        "citizen_name": "Anonymous",
    }

    response = client.post("/api/public/grievances", json=payload)
    assert response.status_code == 404
    data = response.json()
    assert "detail" in data
    assert "does not exist" in data["detail"].lower() or "not found" in data["detail"].lower()

def test_submit_grievance_short_description():
    # Fetch a valid public project ID
    projects_resp = client.get("/api/public/projects?page=1&page_size=1")
    items = projects_resp.json().get("items", [])
    project_id = items[0]["project_id"]

    payload = {
        "project_id": project_id,
        "project_title": "Test Title",
        "issue_type": "quality",
        "description": "Too short",  # < 20 chars
    }

    response = client.post("/api/public/grievances", json=payload)
    assert response.status_code == 422 or response.status_code == 400

def test_track_nonexistent_grievance():
    response = client.get("/api/public/grievances/track/GRV-99999999-XXXX")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()

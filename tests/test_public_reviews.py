import os
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_submit_citizen_review_success():
    # 1. Fetch valid public project ID
    projects_resp = client.get("/api/public/projects?page=1&page_size=1")
    assert projects_resp.status_code == 200
    items = projects_resp.json().get("items", [])
    assert len(items) > 0, "No public projects found in DB"

    project_id = items[0]["project_id"]
    project_title = items[0].get("title") or items[0].get("description") or "Test Project"

    # 2. Submit multi-factor review & feedback
    payload = {
        "project_id": project_id,
        "project_title": project_title,
        "overall_rating": 5,
        "quality_rating": 4,
        "timeline_rating": 5,
        "utility_rating": 5,
        "transparency_rating": 4,
        "feedback_text": "The community hall construction is exemplary. Quality materials were used and completed on schedule.",
        "reviewer_name": "Sunita Verma",
        "reviewer_contact": "sunita@example.com",
        "would_recommend": True
    }

    response = client.post("/api/public/reviews", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "review_id" in data
    assert data["review_id"].startswith("REV-")
    assert data["project_id"] == project_id
    assert "summary" in data

    # 3. Verify get project reviews endpoint
    get_resp = client.get(f"/api/public/reviews/project/{project_id}")
    assert get_resp.status_code == 200
    get_data = get_resp.json()
    assert get_data["project_id"] == project_id
    assert get_data["total_reviews"] >= 1
    assert get_data["factors"]["overall"] >= 1.0
    assert len(get_data["reviews"]) >= 1
    assert get_data["reviews"][0]["feedback_text"] == payload["feedback_text"]

    # 4. Verify CSV ledger created
    csv_path = os.path.join("data", "demo_dataset", "citizen_reviews_log.csv")
    assert os.path.exists(csv_path), "CSV ledger was not created"
    with open(csv_path, "r", encoding="utf-8") as f:
        content = f.read()
        assert data["review_id"] in content

def test_submit_citizen_review_nonexistent_project():
    payload = {
        "project_id": "INVALID-PROJECT-ID-999999",
        "overall_rating": 4,
        "quality_rating": 4,
        "timeline_rating": 4,
        "utility_rating": 4,
        "transparency_rating": 4,
        "feedback_text": "Great work overall on this project.",
        "reviewer_name": "Test User",
    }
    response = client.post("/api/public/reviews", json=payload)
    assert response.status_code == 404
    assert "does not exist" in response.json()["detail"].lower()

def test_submit_citizen_review_invalid_rating():
    projects_resp = client.get("/api/public/projects?page=1&page_size=1")
    items = projects_resp.json().get("items", [])
    project_id = items[0]["project_id"]

    payload = {
        "project_id": project_id,
        "overall_rating": 10,  # > 5 invalid
        "feedback_text": "This rating should be rejected.",
    }
    response = client.post("/api/public/reviews", json=payload)
    assert response.status_code == 422

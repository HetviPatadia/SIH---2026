import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

# 1. Test GET /api/evidence - list across all projects
def test_get_global_evidence_basic():
    response = client.get("/api/evidence")
    assert response.status_code == 200
    data = response.json()
    assert "total" in data
    assert "page" in data
    assert "page_size" in data
    assert "items" in data
    assert isinstance(data["items"], list)
    if data["total"] > 0:
        item = data["items"][0]
        assert "evidence_id" in item
        assert "project_id" in item
        assert "status" in item
        assert "similarity_signal" in item
        assert "location_consistency" in item
        assert "temporal_consistency" in item

# 2. Test pagination
def test_global_evidence_pagination():
    response = client.get("/api/evidence?page=1&page_size=5")
    assert response.status_code == 200
    data = response.json()
    assert data["page"] == 1
    assert data["page_size"] == 5
    assert len(data["items"]) <= 5

# 3. Test evidence filters (evidence_type, project_id, status)
def test_global_evidence_filters():
    # Filter by evidence_type
    response = client.get("/api/evidence?evidence_type=COMPLETION_PHOTO")
    assert response.status_code == 200
    data = response.json()
    for item in data["items"]:
        assert item["evidence_type"] == "COMPLETION_PHOTO"

    # Filter by search
    response_search = client.get("/api/evidence?search=MPL")
    assert response_search.status_code == 200
    assert "items" in response_search.json()

# 4. Test deterministic status and confidence
def test_evidence_status_and_confidence():
    response = client.get("/api/evidence?page_size=20")
    assert response.status_code == 200
    items = response.json()["items"]
    valid_statuses = [
        "VERIFIED", "REVIEW_REQUIRED", "POTENTIAL_REUSE",
        "LOCATION_INCONSISTENCY", "TEMPORAL_INCONSISTENCY",
        "INSUFFICIENT_METADATA", "UNAVAILABLE"
    ]
    for it in items:
        assert it["status"] in valid_statuses
        if it["confidence"] is not None:
            assert 0.0 <= it["confidence"] <= 100.0

# 5. Test GET /api/projects/{project_id}/evidence enriched with status and confidence
def test_project_evidence_enriched():
    # Get first evidence item to know a valid project_id
    ev_list = client.get("/api/evidence?page_size=1").json()
    if ev_list["items"]:
        pid = ev_list["items"][0]["project_id"]
        response = client.get(f"/api/projects/{pid}/evidence")
        assert response.status_code == 200
        items = response.json()
        assert len(items) > 0
        for ev in items:
            assert "status" in ev
            assert "evidence_id" in ev
            assert "file" in ev
            assert "metadata_record" in ev
            assert "hashes" in ev

# 6. Test GET /api/evidence/{evidence_id} with valid and invalid IDs
def test_evidence_detail_and_invalid_id():
    ev_list = client.get("/api/evidence?page_size=1").json()
    if ev_list["items"]:
        valid_eid = ev_list["items"][0]["evidence_id"]
        resp_valid = client.get(f"/api/evidence/{valid_eid}")
        assert resp_valid.status_code == 200
        data = resp_valid.json()
        assert data["evidence_id"] == valid_eid
        assert "status" in data

    resp_invalid = client.get("/api/evidence/NON_EXISTENT_EVIDENCE_99999")
    assert resp_invalid.status_code == 404

# 7. Test POST /api/evidence/compare using exact evidence IDs
def test_evidence_compare_by_evidence_ids():
    ev_list = client.get("/api/evidence?page_size=2").json()
    if len(ev_list["items"]) >= 2:
        eid_a = ev_list["items"][0]["evidence_id"]
        eid_b = ev_list["items"][1]["evidence_id"]

        resp = client.post("/api/evidence/compare", json={
            "evidence_id_a": eid_a,
            "evidence_id_b": eid_b,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["comparison_type"] == "EVIDENCE"
        assert "evidence_a" in data
        assert "evidence_b" in data
        assert "similarity_analysis" in data
        assert "consistency_summary" in data
        assert "finding" in data["consistency_summary"]
        assert "similarity_score" in data["similarity_analysis"]

# 8. Test POST /api/evidence/compare backward compatibility with project IDs
def test_evidence_compare_by_project_ids():
    p_resp = client.get("/api/projects?page_size=2").json()
    if len(p_resp["items"]) >= 2:
        pid_a = p_resp["items"][0]["project_id"]
        pid_b = p_resp["items"][1]["project_id"]

        resp = client.post("/api/evidence/compare", json={
            "project_id_a": pid_a,
            "project_id_b": pid_b,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["comparison_type"] == "PROJECT"
        assert "project_a" in data
        assert "project_b" in data

# 9. Test GET /api/evidence/summary derives real counts
def test_evidence_summary_kpis():
    resp = client.get("/api/evidence/summary")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_evidence_items" in data
    assert "projects_with_evidence" in data
    assert "potential_reuse_signals" in data
    assert "location_inconsistency_signals" in data
    assert "temporal_inconsistency_signals" in data
    assert "high_priority_evidence_cases" in data
    assert data["total_evidence_items"] >= 0

# 10. Test GET /api/evidence/cases/high-priority has human-in-the-loop review terminology
def test_high_priority_evidence_cases_terminology():
    resp = client.get("/api/evidence/cases/high-priority")
    assert resp.status_code == 200
    cases = resp.json()
    assert isinstance(cases, list)
    for c in cases:
        assert "review_priority" in c
        assert c["review_priority"] == "HIGH_PRIORITY_REVIEW"
        assert "audit_recommendation" in c
        assert "Requires Human Verification" in c["audit_recommendation"]

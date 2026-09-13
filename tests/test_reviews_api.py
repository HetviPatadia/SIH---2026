import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

# 1. Test GET /api/projects with review integration fields
def test_projects_list_enriched_review_fields():
    response = client.get("/api/projects?page=1&page_size=10")
    assert response.status_code == 200
    data = response.json()
    assert "total" in data
    assert "items" in data
    assert len(data["items"]) > 0

    item = data["items"][0]
    # Check all Step 6.2 review integration fields exist
    assert "audit_priority" in item
    assert isinstance(item["audit_priority"], (int, float))
    assert "priority_level" in item
    assert item["priority_level"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    assert "why_flagged" in item
    assert isinstance(item["why_flagged"], str)
    assert "evidence_status" in item
    assert item["evidence_status"] in [
        "VERIFIED", "REVIEW_REQUIRED", "POTENTIAL_REUSE",
        "LOCATION_INCONSISTENCY", "TEMPORAL_INCONSISTENCY",
        "INSUFFICIENT_METADATA", "UNAVAILABLE"
    ]
    assert "review_status" in item
    assert item["review_status"] in [
        "NEW", "UNDER_REVIEW", "VERIFICATION_REQUIRED",
        "VERIFIED", "DISMISSED", "ESCALATED", "CLOSED"
    ]
    assert "assigned_to" in item
    assert "case_id" in item
    assert "updated_at" in item
    assert "primary_signals" in item
    assert isinstance(item["primary_signals"], list)

# 2. Test priority filtering (single and comma-separated)
def test_projects_list_priority_filters():
    # Single priority HIGH
    res_high = client.get("/api/projects?priority=HIGH")
    assert res_high.status_code == 200
    data_high = res_high.json()
    for item in data_high["items"]:
        assert item["priority_level"] == "HIGH"

    # Single priority CRITICAL
    res_crit = client.get("/api/projects?priority=CRITICAL")
    assert res_crit.status_code == 200
    data_crit = res_crit.json()
    for item in data_crit["items"]:
        assert item["priority_level"] == "CRITICAL"

    # Multi priority HIGH,CRITICAL
    res_multi = client.get("/api/projects?priority=HIGH,CRITICAL")
    assert res_multi.status_code == 200
    data_multi = res_multi.json()
    assert data_multi["total"] == data_high["total"] + data_crit["total"]
    for item in data_multi["items"]:
        assert item["priority_level"] in ["HIGH", "CRITICAL"]

# 3. Test district and sector filters
def test_projects_list_district_and_sector_filters():
    res = client.get("/api/projects?district=Rajkot&page_size=10")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] > 0
    for item in data["items"]:
        assert "Rajkot" in item["district"]

    # Sector filter
    res_sector = client.get("/api/projects?sector=Education&page_size=10")
    assert res_sector.status_code == 200
    data_sec = res_sector.json()
    for item in data_sec["items"]:
        assert "Education" in item["sector"]

# 4. Test search across project_id, MP, district, and contractor
def test_projects_list_search():
    # Search by project ID prefix
    res_id = client.get("/api/projects?search=MPL-00001")
    assert res_id.status_code == 200
    data_id = res_id.json()
    assert data_id["total"] >= 1
    assert any(it["project_id"] == "MPL-00001" for it in data_id["items"])

    # Search by contractor entity
    res_ent = client.get("/api/projects?search=Bharat")
    assert res_ent.status_code == 200
    data_ent = res_ent.json()
    assert data_ent["total"] >= 1

# 5. Test review_status filter
def test_projects_list_review_status_filter():
    res_new = client.get("/api/projects?review_status=NEW&page_size=10")
    assert res_new.status_code == 200
    data = res_new.json()
    for item in data["items"]:
        assert item["review_status"] == "NEW"

# 6. Test evidence_status filter
def test_projects_list_evidence_status_filter():
    res_unavail = client.get("/api/projects?evidence_status=UNAVAILABLE&page_size=10")
    assert res_unavail.status_code == 200
    data_unavail = res_unavail.json()
    assert data_unavail["total"] > 0
    for item in data_unavail["items"]:
        assert item["evidence_status"] == "UNAVAILABLE"

# 7. Test sorting
def test_projects_list_sorting():
    # Sort by audit_priority descending
    res_desc = client.get("/api/projects?sort_by=audit_priority&sort_order=desc&page_size=10")
    assert res_desc.status_code == 200
    items_desc = res_desc.json()["items"]
    scores_desc = [it["audit_priority"] for it in items_desc]
    assert scores_desc == sorted(scores_desc, reverse=True)

    # Sort by audit_priority ascending
    res_asc = client.get("/api/projects?sort_by=audit_priority&sort_order=asc&page_size=10")
    assert res_asc.status_code == 200
    items_asc = res_asc.json()["items"]
    scores_asc = [it["audit_priority"] for it in items_asc]
    assert scores_asc == sorted(scores_asc)

    # Sort by created_at
    res_created = client.get("/api/projects?sort_by=created_at&sort_order=desc&page_size=5")
    assert res_created.status_code == 200

# 8. Test GET /api/investigations/summary
def test_investigations_summary():
    response = client.get("/api/investigations/summary")
    assert response.status_code == 200
    data = response.json()
    assert "total_reviews" in data
    assert "new" in data
    assert "under_review" in data
    assert "verification_required" in data
    assert "verified" in data
    assert "dismissed" in data
    assert "escalated" in data
    assert "closed" in data
    assert "high_priority_reviews" in data
    assert "critical_priority_reviews" in data
    assert data["total_reviews"] > 0
    assert data["total_reviews"] == (
        data["new"] + data["under_review"] + data["verification_required"] +
        data["verified"] + data["dismissed"] + data["escalated"] + data["closed"]
    )

# 9. Test PATCH /api/investigations/{case_id}/status and reviewer assignment
def test_investigation_case_status_transition_and_assignment():
    cases_resp = client.get("/api/investigations?limit=1")
    assert cases_resp.status_code == 200
    cases = cases_resp.json()
    assert len(cases) > 0
    case_id = cases[0]["case_id"]

    # Transition status to UNDER_REVIEW with reviewer assignment and valid note
    update_payload = {
        "status": "UNDER_REVIEW",
        "assigned_to": "Senior Auditor Sharma",
        "notes": "Commencing preliminary audit check on site photos and cost variance."
    }
    patch_resp = client.patch(f"/api/investigations/{case_id}/status", json=update_payload)
    assert patch_resp.status_code == 200
    updated_case = patch_resp.json()
    assert updated_case["status"] == "UNDER_REVIEW"
    assert updated_case["assigned_to"] == "Senior Auditor Sharma"

    # Verify note was appended to the case
    notes = updated_case["notes"]
    assert any("UNDER_REVIEW" in n["note_text"] for n in notes)

    # Test invalid status returns 400
    invalid_resp = client.patch(f"/api/investigations/{case_id}/status", json={"status": "INVALID_STATUS"})
    assert invalid_resp.status_code == 400

# 10. Test POST /api/investigations/{case_id}/notes validation
def test_investigation_note_validation():
    cases_resp = client.get("/api/investigations?limit=1")
    case_id = cases_resp.json()[0]["case_id"]

    # Empty note text should return 400
    empty_note = {"author": "Auditor", "note_text": "   "}
    err_resp = client.post(f"/api/investigations/{case_id}/notes", json=empty_note)
    assert err_resp.status_code == 400

    # Valid note should succeed
    valid_note = {
        "author": "Auditor Verma",
        "note_text": "Field engineer reports structural column alignment is consistent with blueprints.",
        "action_taken": "Physical site verification verified"
    }
    ok_resp = client.post(f"/api/investigations/{case_id}/notes", json=valid_note)
    assert ok_resp.status_code == 200
    data = ok_resp.json()
    assert data["author"] == "Auditor Verma"
    assert "structural column alignment" in data["note_text"]

# 11. Test audit trail history persistence
def test_investigation_case_audit_history():
    cases_resp = client.get("/api/investigations?limit=1")
    case_id = cases_resp.json()[0]["case_id"]

    hist_resp = client.get(f"/api/investigations/cases/{case_id}/history")
    assert hist_resp.status_code == 200
    logs = hist_resp.json()
    assert isinstance(logs, list)
    assert len(logs) > 0
    assert any(l["action"] in ["UPDATE_CASE_STATUS", "ADD_INVESTIGATION_NOTE"] for l in logs)

# 12. Terminology compliance check (Strict non-accusatory, audit-first language)
def test_reviews_terminology_compliance():
    response = client.get("/api/projects?page=1&page_size=20")
    assert response.status_code == 200
    items = response.json()["items"]
    forbidden_terms = ["fraud detected", "fraud probability", "corrupt contractor", "guilty", "confirmed fraud"]
    for item in items:
        wf = (item.get("why_flagged") or "").lower()
        for forbidden in forbidden_terms:
            assert forbidden not in wf, f"Forbidden term '{forbidden}' detected in why_flagged: {wf}"

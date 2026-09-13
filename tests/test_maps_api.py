import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

# 1. Test GET /api/maps/projects default markers
def test_maps_projects_default():
    response = client.get("/api/maps/projects?limit=50")
    assert response.status_code == 200
    data = response.json()
    assert "total_markers" in data
    assert "markers" in data
    assert data["total_markers"] == len(data["markers"])
    assert len(data["markers"]) > 0

    m0 = data["markers"][0]
    assert "project_id" in m0
    assert "title" in m0
    assert "latitude" in m0
    assert "longitude" in m0
    assert "priority_level" in m0
    assert "unified_score" in m0
    assert "sanctioned_amount" in m0
    assert "district" in m0
    assert "sector" in m0
    # Geographic validity
    assert -90.0 <= m0["latitude"] <= 90.0
    assert -180.0 <= m0["longitude"] <= 180.0

# 2. Test district and sector filter on map markers
def test_maps_projects_district_and_sector_filter():
    response = client.get("/api/maps/projects?district=Rajkot&sector=Education&limit=20")
    assert response.status_code == 200
    data = response.json()
    assert data["total_markers"] > 0
    for m in data["markers"]:
        assert "Rajkot" in m["district"]
        assert "Education" in m["sector"]

# 3. Test priority filter on map markers (single and comma-separated)
def test_maps_projects_priority_filter():
    # Single priority CRITICAL
    res_crit = client.get("/api/maps/projects?priority=CRITICAL&limit=20")
    assert res_crit.status_code == 200
    for m in res_crit.json()["markers"]:
        assert m["priority_level"] == "CRITICAL"

    # Multi priority HIGH,CRITICAL
    res_multi = client.get("/api/maps/projects?priority=HIGH,CRITICAL&limit=50")
    assert res_multi.status_code == 200
    for m in res_multi.json()["markers"]:
        assert m["priority_level"] in ["HIGH", "CRITICAL"]

# 4. Test marker limits
def test_maps_projects_limit():
    response = client.get("/api/maps/projects?limit=15")
    assert response.status_code == 200
    data = response.json()
    assert data["total_markers"] <= 15
    assert len(data["markers"]) <= 15

# 5. Test GET /api/maps/clusters with DBSCAN spatial parameters
def test_maps_clusters_dbscan():
    # 1 km radius, min 3 projects
    response = client.get("/api/maps/clusters?radius_km=1.0&min_projects=3")
    assert response.status_code == 200
    clusters = response.json()
    assert isinstance(clusters, list)
    assert len(clusters) > 0

    c0 = clusters[0]
    assert "cluster_id" in c0
    assert "center_lat" in c0
    assert "center_lon" in c0
    assert "project_count" in c0
    assert c0["project_count"] >= 3
    assert "avg_risk_score" in c0
    assert "district" in c0
    assert "anomaly_flag_count" in c0
    assert "radius_km" in c0
    assert c0["radius_km"] == 1.0
    assert "projects" in c0
    assert len(c0["projects"]) == c0["project_count"]

# 6. Test clusters with district filter
def test_maps_clusters_district_filter():
    response = client.get("/api/maps/clusters?radius_km=2.0&min_projects=3&district=Rajkot")
    assert response.status_code == 200
    clusters = response.json()
    for c in clusters:
        assert c["district"] == "Rajkot"

# 7. Test clusters with priority filter
def test_maps_clusters_priority_filter():
    response = client.get("/api/maps/clusters?radius_km=2.0&min_projects=2&priority=HIGH,CRITICAL")
    assert response.status_code == 200
    clusters = response.json()
    for c in clusters:
        assert c["project_count"] >= 2
        assert c["high_priority_count"] == c["project_count"]

# 8. Test GET /api/maps/summary KPI statistics
def test_maps_summary_kpis():
    response = client.get("/api/maps/summary")
    assert response.status_code == 200
    data = response.json()
    assert "total_projects" in data
    assert "projects_with_coordinates" in data
    assert "projects_without_coordinates" in data
    assert "high_priority_projects" in data
    assert "critical_priority_projects" in data
    assert "cluster_count" in data
    assert "spatial_signal_count" in data
    assert data["total_projects"] == data["projects_with_coordinates"] + data["projects_without_coordinates"]
    assert data["cluster_count"] > 0

# 9. Test GET /api/projects/{project_id}/nearby geographic search
def test_project_nearby_spatial_search():
    # MPL-00001 has verified neighbors within 5km
    response = client.get("/api/projects/MPL-00001/nearby?radius_km=5.0")
    assert response.status_code == 200
    data = response.json()
    assert "project_id" in data
    assert data["project_id"] == "MPL-00001"
    assert "nearby" in data
    assert len(data["nearby"]) > 0

    # Ensure sorted by distance ascending
    distances = [n["distance_km"] for n in data["nearby"]]
    assert distances == sorted(distances)

    n0 = data["nearby"][0]
    assert "title" in n0
    assert "distance_km" in n0
    assert "distance_meters" in n0
    assert "latitude" in n0
    assert "longitude" in n0
    assert "district" in n0
    assert "sector" in n0
    assert "priority_level" in n0
    assert "audit_priority" in n0
    assert "sanctioned_amount" in n0
    assert n0["distance_km"] <= 5.0

# 10. Test nearby search with small radius returning empty
def test_project_nearby_small_radius_empty():
    # 0.1 km (100m) around isolated project
    response = client.get("/api/projects/MPL-00001/nearby?radius_km=0.1")
    assert response.status_code == 200
    data = response.json()
    assert "nearby" in data
    assert isinstance(data["nearby"], list)

# 11. Test nearby search for non-existent project (404 / empty)
def test_project_nearby_nonexistent_project():
    response = client.get("/api/projects/NON_EXISTENT_PROJECT/nearby")
    assert response.status_code == 200
    assert response.json()["nearby"] == []

# 12. Test GET /api/maps/projects/{project_id}/location-consistency
def test_project_evidence_location_consistency():
    response = client.get("/api/maps/projects/MPL-00001/location-consistency")
    assert response.status_code == 200
    data = response.json()
    assert data["project_id"] == "MPL-00001"
    assert data["has_project_coords"] is True
    assert "project_location" in data
    assert "latitude" in data["project_location"]
    assert "longitude" in data["project_location"]
    assert data["evidence_count"] > 0
    assert data["overall_consistency"] in ["CONSISTENT", "INCONSISTENT", "UNAVAILABLE"]

    for rec in data["evidence_records"]:
        assert "evidence_id" in rec
        assert "has_gps" in rec
        assert "consistency" in rec
        if rec["has_gps"]:
            assert "distance_meters" in rec
            assert rec["distance_meters"] is not None

# 13. Test location-consistency for non-existent project (404)
def test_project_location_consistency_not_found():
    response = client.get("/api/maps/projects/NON_EXISTENT_PID/location-consistency")
    assert response.status_code == 404

# 14. Terminology compliance check (Strict non-accusatory, spatial pattern language)
def test_maps_terminology_compliance():
    response = client.get("/api/maps/clusters?radius_km=2.0&min_projects=3")
    assert response.status_code == 200
    clusters = response.json()
    forbidden_terms = ["fraud zone", "corruption zone", "fraud cluster", "confirmed fraud location"]
    for c in clusters:
        desc_text = str(c).lower()
        for forbidden in forbidden_terms:
            assert forbidden not in desc_text, f"Forbidden term '{forbidden}' detected in cluster: {desc_text}"

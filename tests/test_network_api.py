import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

# 1. Test GET /api/network/graph default response
def test_network_graph_default():
    response = client.get("/api/network/graph")
    assert response.status_code == 200
    data = response.json()
    assert "nodes" in data
    assert "edges" in data
    assert "status" in data
    assert "metrics" in data
    assert data["status"] == "SUCCESS"
    assert len(data["nodes"]) > 0
    assert len(data["edges"]) > 0

    metrics = data["metrics"]
    assert "node_count" in metrics
    assert "edge_count" in metrics
    assert "project_count" in metrics
    assert "contractor_count" in metrics
    assert "district_count" in metrics
    assert metrics["node_count"] == len(data["nodes"])
    assert metrics["edge_count"] == len(data["edges"])

# 2. Test empty graph query
def test_network_graph_empty_query():
    response = client.get("/api/network/graph?district=NonExistentDistrictXYZ")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert len(data["nodes"]) == 0
    assert len(data["edges"]) == 0
    assert data["metrics"]["node_count"] == 0

# 3. Test project-centered graph (e.g. project_id=MPL-00001)
def test_network_graph_project_centered():
    response = client.get("/api/network/graph?project_id=MPL-00001")
    assert response.status_code == 200
    data = response.json()
    assert len(data["nodes"]) > 0
    # Must contain the project node
    node_ids = [n["id"] for n in data["nodes"]]
    assert "project:MPL-00001" in node_ids

    # Connected to contractor and district
    types = {n["type"] for n in data["nodes"]}
    assert "PROJECT" in types
    assert "CONTRACTOR" in types
    assert "DISTRICT" in types

# 4. Test contractor filter
def test_network_graph_contractor_filter():
    response = client.get("/api/network/graph?contractor=Bharat")
    assert response.status_code == 200
    data = response.json()
    contractor_nodes = [n for n in data["nodes"] if n["type"] == "CONTRACTOR"]
    assert len(contractor_nodes) >= 1
    assert any("Bharat" in c["label"] for c in contractor_nodes)

# 5. Test district filter
def test_network_graph_district_filter():
    response = client.get("/api/network/graph?district=Rajkot")
    assert response.status_code == 200
    data = response.json()
    district_nodes = [n for n in data["nodes"] if n["type"] == "DISTRICT"]
    assert any(d["label"] == "Rajkot" for d in district_nodes)

# 6. Test priority filter
def test_network_graph_priority_filter():
    response = client.get("/api/network/graph?priority=CRITICAL")
    assert response.status_code == 200
    data = response.json()
    project_nodes = [n for n in data["nodes"] if n["type"] == "PROJECT"]
    for p in project_nodes:
        assert p["risk_level"] == "CRITICAL"

# 7. Test combined filters (district + priority)
def test_network_graph_combined_filters():
    response = client.get("/api/network/graph?district=Rajkot&priority=HIGH,CRITICAL")
    assert response.status_code == 200
    data = response.json()
    project_nodes = [n for n in data["nodes"] if n["type"] == "PROJECT"]
    for p in project_nodes:
        assert p["risk_level"] in ["HIGH", "CRITICAL"]
        assert p["metadata"]["district"] == "Rajkot"

# 8. Test graph limits
def test_network_graph_limit():
    response = client.get("/api/network/graph?limit=15")
    assert response.status_code == 200
    data = response.json()
    project_nodes = [n for n in data["nodes"] if n["type"] == "PROJECT"]
    assert len(project_nodes) <= 15

# 9. Test duplicate node prevention
def test_network_graph_duplicate_node_prevention():
    response = client.get("/api/network/graph?limit=50")
    assert response.status_code == 200
    nodes = response.json()["nodes"]
    node_ids = [n["id"] for n in nodes]
    assert len(node_ids) == len(set(node_ids)), "Duplicate node IDs detected in graph response"

# 10. Test correct edge relationships and human-readable explanations
def test_network_graph_edge_relationships():
    response = client.get("/api/network/graph?limit=30")
    assert response.status_code == 200
    edges = response.json()["edges"]
    valid_relations = ["AWARDED_TO", "LOCATED_IN", "ASSOCIATED_WITH", "POTENTIAL_EVIDENCE_REUSE"]
    for e in edges:
        assert e["relation"] in valid_relations
        assert "source" in e
        assert "target" in e
        assert "explanation" in e
        assert isinstance(e["explanation"], str)
        assert e["weight"] >= 1.0

# 11. Test GET /api/network/contractor/{name} investigation endpoint
def test_contractor_investigation_endpoint():
    response = client.get("/api/network/contractor/Bharat")
    assert response.status_code == 200
    data = response.json()
    assert "contractor" in data
    assert "Bharat" in data["contractor"]
    assert "summary" in data
    summary = data["summary"]
    assert summary["total_projects"] > 0
    assert summary["district_count"] > 0
    assert summary["average_audit_priority"] >= 0.0
    assert summary["total_sanctioned_amount"] > 0.0
    assert len(data["projects"]) == summary["total_projects"]
    assert len(data["nodes"]) > 0
    assert len(data["edges"]) > 0

# 12. Test contractor endpoint with non-existent contractor (404)
def test_contractor_investigation_not_found():
    response = client.get("/api/network/contractor/NonExistentContractor999")
    assert response.status_code == 404

# 13. Test node_type filter
def test_network_graph_node_type_filter():
    response = client.get("/api/network/graph?node_type=CONTRACTOR&limit=20")
    assert response.status_code == 200
    nodes = response.json()["nodes"]
    for n in nodes:
        assert n["type"] == "CONTRACTOR"

# 14. Test evidence relationship in graph
def test_network_graph_evidence_relationship():
    response = client.get("/api/network/graph?project_id=MPL-00001")
    assert response.status_code == 200
    data = response.json()
    evidence_nodes = [n for n in data["nodes"] if n["type"] == "EVIDENCE"]
    assert len(evidence_nodes) >= 1
    evidence_edges = [e for e in data["edges"] if e["relation"] == "ASSOCIATED_WITH"]
    assert len(evidence_edges) >= 1

# 15. Test terminology compliance across nodes, edges, and explanations
def test_network_graph_terminology_compliance():
    response = client.get("/api/network/graph?limit=50")
    assert response.status_code == 200
    data = response.json()
    forbidden_terms = ["fraud network", "corrupt contractor", "criminal network", "fraud probability", "confirmed fraud"]

    for edge in data["edges"]:
        expl = (edge.get("explanation") or "").lower()
        rel = (edge.get("relation") or "").lower()
        for forbidden in forbidden_terms:
            assert forbidden not in expl, f"Forbidden term in edge explanation: {expl}"
            assert forbidden not in rel, f"Forbidden term in edge relation: {rel}"

    for node in data["nodes"]:
        lbl = (node.get("label") or "").lower()
        for forbidden in forbidden_terms:
            assert forbidden not in lbl, f"Forbidden term in node label: {lbl}"

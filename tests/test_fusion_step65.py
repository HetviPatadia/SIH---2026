import pytest
import pandas as pd
from fastapi.testclient import TestClient

from backend.app.main import app
from ai.fusion.engine import MultiModalFusionEngine
from ai.risk.engine import UnifiedRiskEngine
from ai.features.split_tender import SplitTenderEngine
from ai.explainability.shap_engine import ExplainableAIEngine

client = TestClient(app)

@pytest.fixture
def fusion_engine():
    return MultiModalFusionEngine()

@pytest.fixture
def risk_engine():
    return UnifiedRiskEngine()

@pytest.fixture
def baseline_signals():
    """Returns baseline normal outputs for all 7 analytical domains."""
    return {
        "fin_res": {"score": 0.05, "signal": "NORMAL", "explanation": "Standard cost parameters.", "evidence": {}},
        "temp_res": {"score": 0.05, "signal": "NORMAL", "explanation": "Normal timeline cadence.", "evidence": {}},
        "text_res": {"score": 0.05, "signal": "NORMAL", "explanation": "Unique project description.", "evidence": {}},
        "spatial_res": {"score": 0.05, "signal": "NORMAL_SPATIAL_DISTRIBUTION", "explanation": "Standard regional spacing.", "evidence": {}},
        "network_res": {"score": 0.05, "signal": "NORMAL_LOAD", "explanation": "Balanced contractor portfolio.", "evidence": {}},
        "split_res": {"score": 0.05, "signal": "NORMAL", "explanation": "Standard tender sizing.", "is_split_candidate": False, "split_cluster_size": 1},
        "evidence_res": {"available": True, "score": 0.0, "status": "EVIDENCE_PRESENT", "signal": "EVIDENCE_VERIFIED", "signals": ["EVIDENCE_VERIFIED"], "explanation": "Compliant evidence."},
    }

# 1. Financial-only project
def test_financial_only_project(fusion_engine, risk_engine, baseline_signals):
    signals = baseline_signals.copy()
    signals["fin_res"] = {
        "score": 0.90,
        "signal": "COST_OUTLIER",
        "explanation": "Sanctioned cost is 3.5x higher than sector median benchmark.",
        "evidence": {"sanctioned_amount": 5000000.0, "cost_to_peer_ratio": 3.5},
    }
    fused = fusion_engine.fuse("P_FIN", **signals)
    score, level = risk_engine.calculate_priority(fused["composite_index"])
    top_reasons = risk_engine.extract_top_reasons(fused["contributions"], fused["domain_signals"])

    assert score >= 70.0
    assert level in ["HIGH", "CRITICAL"]
    assert fused["contributions"]["financial"] > 30.0
    assert top_reasons[0]["domain"] == "financial"
    assert "expenditure pattern" in top_reasons[0]["reason"].lower()

# 2. Temporal-only signal
def test_temporal_only_signal(fusion_engine, risk_engine, baseline_signals):
    signals = baseline_signals.copy()
    signals["temp_res"] = {
        "score": 0.85,
        "signal": "VELOCITY_SPIKE",
        "explanation": "Rapid expenditure velocity: fund disbursed over 5 days.",
        "evidence": {"duration_days": 5},
    }
    fused = fusion_engine.fuse("P_TEMP", **signals)
    score, level = risk_engine.calculate_priority(fused["composite_index"])
    top_reasons = risk_engine.extract_top_reasons(fused["contributions"], fused["domain_signals"])

    assert score > 30.0
    assert fused["contributions"]["temporal"] > 0.0
    assert any(r["domain"] == "temporal" for r in top_reasons)

# 3. NLP signal
def test_nlp_signal(fusion_engine, risk_engine, baseline_signals):
    signals = baseline_signals.copy()
    signals["text_res"] = {
        "score": 0.88,
        "signal": "HIGH_TEXT_DUPLICATION",
        "explanation": "Repetitive description matching 4 other projects in the same ward.",
        "evidence": {"max_similarity": 0.92},
    }
    fused = fusion_engine.fuse("P_NLP", **signals)
    score, level = risk_engine.calculate_priority(fused["composite_index"])
    top_reasons = risk_engine.extract_top_reasons(fused["contributions"], fused["domain_signals"])

    assert score > 30.0
    assert fused["contributions"]["text"] > 0.0
    assert any(r["domain"] == "text" for r in top_reasons)

# 4. Spatial signal
def test_spatial_signal(fusion_engine, risk_engine, baseline_signals):
    signals = baseline_signals.copy()
    signals["spatial_res"] = {
        "score": 0.85,
        "signal": "POTENTIAL_GEO_DUPLICATE",
        "explanation": "Unusual physical proximity to sibling project within 45 meters.",
        "evidence": {"nearest_neighbor_distance_km": 0.045},
    }
    fused = fusion_engine.fuse("P_SPAT", **signals)
    score, level = risk_engine.calculate_priority(fused["composite_index"])
    top_reasons = risk_engine.extract_top_reasons(fused["contributions"], fused["domain_signals"])

    assert score > 30.0
    assert fused["contributions"]["spatial"] > 0.0
    assert any(r["domain"] == "spatial" for r in top_reasons)

# 5. Network signal
def test_network_signal(fusion_engine, risk_engine, baseline_signals):
    signals = baseline_signals.copy()
    signals["network_res"] = {
        "score": 0.85,
        "signal": "HIGH_DEGREE_CONCENTRATION",
        "explanation": "Contractor holds over 65% of all sector allocations in district.",
        "evidence": {"contractor_name": "Apex Builders", "contractor_total_projects": 45},
    }
    fused = fusion_engine.fuse("P_NET", **signals)
    score, level = risk_engine.calculate_priority(fused["composite_index"])
    top_reasons = risk_engine.extract_top_reasons(fused["contributions"], fused["domain_signals"])

    assert score > 30.0
    assert fused["contributions"]["network"] > 0.0
    assert any(r["domain"] == "network" for r in top_reasons)

# 6. Split-tender signal
def test_split_tender_signal(fusion_engine, risk_engine, baseline_signals):
    signals = baseline_signals.copy()
    signals["split_res"] = {
        "status": "AVAILABLE",
        "score": 0.80,
        "signal": "POTENTIAL_SPLIT_TENDER",
        "explanation": "Work value near statutory ceiling with 3 similar projects in village awarded closely.",
        "related_project_ids": ["P02", "P03"],
        "is_split_candidate": True,
        "split_cluster_size": 3,
    }
    fused = fusion_engine.fuse("P_SPLIT", **signals)
    score, level = risk_engine.calculate_priority(fused["composite_index"])
    top_reasons = risk_engine.extract_top_reasons(fused["contributions"], fused["domain_signals"])

    assert score > 30.0
    assert fused["contributions"]["split_tender"] > 0.0
    assert any(r["domain"] == "split_tender" for r in top_reasons)
    summary = risk_engine.generate_explanation_summary(level, fused["contributions"], fused["domain_signals"])
    assert "procurement" in summary.lower() or "ceiling" in summary.lower() or "tender" in summary.lower()

# 7. Evidence signal
def test_evidence_signal(fusion_engine, risk_engine, baseline_signals):
    signals = baseline_signals.copy()
    signals["evidence_res"] = {
        "available": True,
        "score": 0.95,
        "status": "EVIDENCE_PRESENT",
        "signal": "EXACT_PHOTO_REUSE",
        "signals": ["EXACT_PHOTO_REUSE"],
        "explanation": "Cryptographic SHA-256 hash collision with completion photo from project MPL-00002.",
        "evidence_count": 2,
    }
    fused = fusion_engine.fuse("P_EV", **signals)
    score, level = risk_engine.calculate_priority(fused["composite_index"])
    top_reasons = risk_engine.extract_top_reasons(fused["contributions"], fused["domain_signals"])

    assert score >= 75.0
    assert level in ["HIGH", "CRITICAL"]
    assert fused["contributions"]["evidence"] > 30.0
    assert any(r["domain"] == "evidence" for r in top_reasons)

# 8. Multiple-domain fusion
def test_multiple_domain_fusion(fusion_engine, risk_engine, baseline_signals):
    signals = baseline_signals.copy()
    signals["fin_res"] = {
        "score": 0.85,
        "signal": "COST_OUTLIER",
        "explanation": "High cost outlier.",
        "evidence": {"cost_to_peer_ratio": 3.0},
    }
    signals["split_res"] = {
        "status": "AVAILABLE",
        "score": 0.80,
        "signal": "POTENTIAL_SPLIT_TENDER",
        "explanation": "Split tender near threshold.",
        "is_split_candidate": True,
        "split_cluster_size": 3,
    }
    fused = fusion_engine.fuse("P_MULTI", **signals)
    score, level = risk_engine.calculate_priority(fused["composite_index"])
    top_reasons = risk_engine.extract_top_reasons(fused["contributions"], fused["domain_signals"])

    # Corroborating multi-modal signals should yield CRITICAL or HIGH
    assert score >= 75.0
    assert len(top_reasons) >= 2
    domains = [r["domain"] for r in top_reasons]
    assert "financial" in domains
    assert "split_tender" in domains

# 9. Missing evidence does NOT create high anomaly score (CRITICAL REQUIREMENT)
def test_missing_evidence_does_not_inflate_score(fusion_engine, risk_engine, baseline_signals):
    signals = baseline_signals.copy()
    # Scenario A: No evidence uploaded
    signals["evidence_res"] = {
        "available": False,
        "score": 0.0,
        "status": "NO_EVIDENCE",
        "signal": "UNAVAILABLE",
        "signals": [],
        "explanation": "No physical asset evidence photographs uploaded.",
    }
    fused_no_ev = fusion_engine.fuse("P_NO_EV", **signals)
    score_no_ev, level_no_ev = risk_engine.calculate_priority(fused_no_ev["composite_index"])

    assert fused_no_ev["domains_available"]["evidence"] is False
    assert fused_no_ev["contributions"]["evidence"] == 0.0
    assert score_no_ev <= 15.0
    assert level_no_ev == "LOW"

    # Scenario B: Evidence uploaded but flagged as INSUFFICIENT_EVIDENCE
    signals["evidence_res"] = {
        "available": True,
        "score": 0.0,  # Insufficient metadata should NOT be scored as an anomaly!
        "status": "EVIDENCE_PRESENT",
        "signal": "INSUFFICIENT_EVIDENCE",
        "signals": ["INSUFFICIENT_EVIDENCE"],
        "explanation": "Missing GPS metadata; insufficient for definitive verification.",
    }
    fused_insufficient = fusion_engine.fuse("P_INSUFFICIENT", **signals)
    score_insuf, level_insuf = risk_engine.calculate_priority(fused_insufficient["composite_index"])

    assert score_insuf <= 15.0
    assert level_insuf == "LOW"
    assert fused_insufficient["contributions"]["evidence"] == 0.0

# 10. Missing coordinates handling
def test_missing_coordinates(fusion_engine, risk_engine, baseline_signals):
    signals = baseline_signals.copy()
    signals["spatial_res"] = {
        "status": "UNAVAILABLE",
        "score": 0.0,
        "signal": "NO_GEO_COORDINATES",
        "explanation": "Geographic coordinates unavailable.",
    }
    fused = fusion_engine.fuse("P_NO_GEO", **signals)
    assert fused["domains_available"]["spatial"] is False
    assert fused["contributions"]["spatial"] == 0.0
    # Active weights should sum to 1.0 without spatial
    assert round(sum(fused["active_weights"].values()), 3) == 1.0

# 11. Missing contractor handling
def test_missing_contractor(fusion_engine, risk_engine, baseline_signals):
    signals = baseline_signals.copy()
    signals["network_res"] = {
        "status": "UNAVAILABLE",
        "score": 0.0,
        "signal": "UNAVAILABLE",
        "explanation": "Contractor entity data unavailable.",
    }
    fused = fusion_engine.fuse("P_NO_CONTRACTOR", **signals)
    assert fused["domains_available"]["network"] is False
    assert fused["contributions"]["network"] == 0.0

# 12. Missing financial data handling
def test_missing_financial_data(fusion_engine, risk_engine, baseline_signals):
    signals = baseline_signals.copy()
    signals["fin_res"] = {"status": "UNAVAILABLE", "score": None, "signal": "UNAVAILABLE"}
    signals["split_res"] = {"status": "UNAVAILABLE", "score": None, "signal": "UNAVAILABLE"}
    fused = fusion_engine.fuse("P_NO_FIN", **signals)
    assert fused["domains_available"]["financial"] is False
    assert fused["domains_available"]["split_tender"] is False

# 13. Missing temporal data handling
def test_missing_temporal_data(fusion_engine, risk_engine, baseline_signals):
    signals = baseline_signals.copy()
    signals["temp_res"] = {"status": "INSUFFICIENT_DATA", "score": 0.0, "signal": "NO_TIMELINE_DATA"}
    fused = fusion_engine.fuse("P_NO_TEMP", **signals)
    assert fused["domains_available"]["temporal"] is False
    assert fused["contributions"]["temporal"] == 0.0

# 14. No anomaly signals (baseline clean project)
def test_no_anomaly_signals(fusion_engine, risk_engine, baseline_signals):
    fused = fusion_engine.fuse("P_CLEAN", **baseline_signals)
    score, level = risk_engine.calculate_priority(fused["composite_index"])
    summary = risk_engine.generate_explanation_summary(level, fused["contributions"], fused["domain_signals"])

    assert score <= 10.0
    assert level == "LOW"
    assert "No strong anomaly signal identified" in summary

# 15. Score normalization (bounds [0.0, 100.0])
def test_score_normalization(fusion_engine, risk_engine, baseline_signals):
    # Test all maximum scores
    max_signals = {
        "fin_res": {"score": 1.0},
        "temp_res": {"score": 1.0},
        "text_res": {"score": 1.0},
        "spatial_res": {"score": 1.0},
        "network_res": {"score": 1.0},
        "split_res": {"score": 1.0},
        "evidence_res": {"score": 1.0, "available": True},
    }
    fused_max = fusion_engine.fuse("P_MAX", **max_signals)
    score_max, level_max = risk_engine.calculate_priority(fused_max["composite_index"])
    assert 0.0 <= score_max <= 100.0
    assert level_max == "CRITICAL"

    # Test all zero scores
    zero_signals = {
        "fin_res": {"score": 0.0},
        "temp_res": {"score": 0.0},
        "text_res": {"score": 0.0},
        "spatial_res": {"score": 0.0},
        "network_res": {"score": 0.0},
        "split_res": {"score": 0.0},
        "evidence_res": {"score": 0.0, "available": True},
    }
    fused_zero = fusion_engine.fuse("P_ZERO", **zero_signals)
    score_zero, level_zero = risk_engine.calculate_priority(fused_zero["composite_index"])
    assert score_zero == 0.0
    assert level_zero == "LOW"

# 16. Priority thresholds verification
def test_priority_thresholds(risk_engine):
    assert risk_engine.calculate_priority(0.10)[1] == "LOW"
    assert risk_engine.calculate_priority(0.30)[1] == "LOW"
    assert risk_engine.calculate_priority(0.31)[1] == "MEDIUM"
    assert risk_engine.calculate_priority(0.60)[1] == "MEDIUM"
    assert risk_engine.calculate_priority(0.61)[1] == "HIGH"
    assert risk_engine.calculate_priority(0.80)[1] == "HIGH"
    assert risk_engine.calculate_priority(0.81)[1] == "CRITICAL"
    assert risk_engine.calculate_priority(1.00)[1] == "CRITICAL"

# 17. Contribution calculations
def test_contribution_calculations(fusion_engine, baseline_signals):
    signals = baseline_signals.copy()
    signals["fin_res"] = {"score": 0.85, "signal": "COST_OUTLIER"}
    signals["spatial_res"] = {"score": 0.80, "signal": "POTENTIAL_GEO_DUPLICATE"}
    fused = fusion_engine.fuse("P_CONTRIB", **signals)
    contribs = fused["contributions"]

    # Contributions should sum to raw final score within rounding tolerance
    final_score = fused["composite_index"] * 100.0
    contrib_sum = sum(contribs.values())
    assert abs(contrib_sum - final_score) < 2.0
    assert contribs["financial"] > contribs["temporal"]

# 18. Explanation generation
def test_explanation_generation(risk_engine):
    contribs = {"financial": 35.0, "split_tender": 25.0, "spatial": 0.0, "temporal": 0.0}
    domain_signals = {
        "financial": {"signal": "COST_OUTLIER"},
        "split_tender": {"signal": "POTENTIAL_SPLIT_TENDER"},
    }
    summary = risk_engine.generate_explanation_summary("HIGH", contribs, domain_signals)
    assert "High Audit Priority" in summary
    assert "expenditure pattern" in summary
    assert "procurement records" in summary

# 19. Deterministic scoring
def test_deterministic_scoring(fusion_engine, baseline_signals):
    fused_1 = fusion_engine.fuse("P_DET", **baseline_signals)
    fused_2 = fusion_engine.fuse("P_DET", **baseline_signals)
    assert fused_1["composite_index"] == fused_2["composite_index"]
    assert fused_1["contributions"] == fused_2["contributions"]

# 20. Audit disclaimer presence
def test_audit_disclaimer_presence():
    response = client.get("/api/explanations/MPL-00001")
    if response.status_code == 200:
        data = response.json()
        assert "audit_disclaimer" in data
        assert "prioritizes" in data["audit_disclaimer"].lower()
        assert "fraud" in data["audit_disclaimer"].lower()

# 21. Dataset and model versioning
def test_dataset_and_model_versioning():
    response = client.get("/api/explanations/MPL-00001")
    if response.status_code == 200:
        data = response.json()
        assert "dataset_version" in data
        assert "model_version" in data

# 22. No fraud-probability output (strict compliance)
def test_no_fraud_probability_output():
    response = client.get("/api/explanations/MPL-00001")
    if response.status_code == 200:
        text = response.text.lower()
        # Strictly forbidden terms
        assert "fraud probability" not in text
        assert "fraud percentage" not in text
        assert "corrupt contractor" not in text
        assert "guilt score" not in text
        assert "guilty" not in text

# 23. Live API explanations endpoint
def test_live_explanations_endpoint():
    response = client.get("/api/explanations/MPL-00001")
    assert response.status_code == 200
    data = response.json()
    assert "unified_score" in data
    assert "priority_level" in data
    assert "top_reasons" in data
    assert isinstance(data["top_reasons"], list)
    assert "domains_available" in data
    assert isinstance(data["domains_available"], dict)
    assert "audit_disclaimer" in data

# 24. Live API anomalies summary endpoint
def test_live_anomalies_summary():
    response = client.get("/api/anomalies/summary")
    assert response.status_code == 200
    data = response.json()
    assert "total_projects" in data
    assert data["total_projects"] > 0
    assert "high_priority_flags" in data
    assert "priority_breakdown" in data
    assert set(data["priority_breakdown"].keys()) == {"LOW", "MEDIUM", "HIGH", "CRITICAL"}

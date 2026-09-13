import pytest
import pandas as pd
from ai.financial.engine import FinancialAnomalyEngine
from ai.spatial.engine import SpatialAnomalyEngine
from ai.nlp.engine import NLPSimilarityEngine
from ai.risk.engine import UnifiedRiskEngine

def test_financial_engine_detects_cost_outlier():
    engine = FinancialAnomalyEngine()
    df = pd.DataFrame([
        {"project_id": "P01", "sanctioned_amount": 1000000.0, "cost_to_peer_ratio": 1.0, "z_cost_sector": 0.1, "sector_median_cost": 1000000.0},
        {"project_id": "P02", "sanctioned_amount": 1100000.0, "cost_to_peer_ratio": 1.1, "z_cost_sector": 0.2, "sector_median_cost": 1000000.0},
        {"project_id": "P03", "sanctioned_amount": 950000.0, "cost_to_peer_ratio": 0.95, "z_cost_sector": -0.1, "sector_median_cost": 1000000.0},
        {"project_id": "P04", "sanctioned_amount": 5500000.0, "cost_to_peer_ratio": 5.5, "z_cost_sector": 4.5, "sector_median_cost": 1000000.0},  # Outlier
    ])

    results = engine.analyze(df)
    assert results["P04"]["score"] >= 0.80
    assert results["P04"]["signal"] == "COST_OUTLIER"
    assert results["P01"]["score"] < 0.50

def test_spatial_engine_detects_duplicate_location():
    engine = SpatialAnomalyEngine(proximity_threshold_km=0.15)
    df = pd.DataFrame([
        {"project_id": "P01", "latitude": 25.31760, "longitude": 82.97390, "sector": "Water", "has_valid_coords": True},
        {"project_id": "P02", "latitude": 25.31770, "longitude": 82.97395, "sector": "Water", "has_valid_coords": True},  # ~12 meters away
        {"project_id": "P03", "latitude": 25.50000, "longitude": 83.10000, "sector": "Water", "has_valid_coords": True},  # Far away
    ])

    results = engine.analyze(df)
    assert results["P01"]["score"] >= 0.80
    assert results["P01"]["signal"] == "POTENTIAL_GEO_DUPLICATE"
    assert "P02" in results["P01"]["nearby_project_ids"]
    assert results["P03"]["signal"] == "NORMAL_SPATIAL_DISTRIBUTION"

def test_nlp_engine_detects_duplicate_text():
    engine = NLPSimilarityEngine(similarity_threshold=0.80)
    df = pd.DataFrame([
        {"project_id": "P01", "normalized_description": "Construction of Community Hall in Kalyanpur Village"},
        {"project_id": "P02", "normalized_description": "Construction of Community Hall in Kalyanpur Village with boundary"},
        {"project_id": "P03", "normalized_description": "Installation of deep borewell drinking water pump in Ward 5"},
    ])

    results = engine.analyze(df)
    assert results["P01"]["score"] >= 0.80
    assert results["P01"]["signal"] == "HIGH_TEXT_DUPLICATION"
    assert results["P03"]["signal"] == "UNIQUE_DESCRIPTION"

def test_unified_risk_priority_scoring():
    risk_eng = UnifiedRiskEngine()
    score_low, level_low = risk_eng.calculate_priority(0.20)
    assert score_low == 20.0
    assert level_low == "LOW"

    score_crit, level_crit = risk_eng.calculate_priority(0.92)
    assert score_crit == 92.0
    assert level_crit == "CRITICAL"

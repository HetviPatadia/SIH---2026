import pytest
import pandas as pd
import numpy as np
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.database.connection import Base
from backend.app.database.models import (
    Entity,
    Project,
    ProjectFinancial,
    ProjectTimeline,
    ProjectDescription,
    ProjectLocation,
    ProjectEntity,
    ContractorProfile,
    PriceIndexRecord,
    ProjectAnalysisHistory,
    RiskScore,
    RiskPriorityEnum,
)
from ai.contractor.profile_engine import ContractorIntelligenceEngine, normalize_contractor_name
from ai.financial.cost_normalizer import CostNormalizationEngine, PriceIndexProvider
from ai.nlp.semantic_engine import SemanticNLPEngine
from backend.app.services.change_detector import IncrementalChangeDetector
from backend.app.services.copilot_service import InvestigationCopilotService


@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()
    yield db
    db.close()


def test_contractor_name_normalization():
    assert normalize_contractor_name("ABC Constructions Pvt Ltd.") == "ABC CONST LTD"
    assert normalize_contractor_name("Sharma Infrastructure Private Limited") == "SHARMA INFRA LTD"
    assert normalize_contractor_name("Royal Company") == "ROYAL CO"


def test_contractor_intelligence_profiling_and_sector_deviation(test_db):
    # Create contractor entity
    c_ent = Entity(entity_id="ENT-001", name="Apex Infra Ltd", entity_type="CONTRACTOR", primary_district="Jaipur")
    test_db.add(c_ent)
    test_db.commit()

    # Seed 5 historical projects in Roads sector
    for i in range(5):
        pid = f"PROJ-ROAD-{i+1}"
        p = Project(project_id=pid, sector="Roads", district="Jaipur", status="Completed")
        test_db.add(p)
        test_db.add(ProjectFinancial(project_id=pid, sanctioned_amount=1000000.0 + (i * 100000.0)))
        test_db.add(ProjectTimeline(project_id=pid, duration_days=180 + (i * 10)))
        test_db.add(ProjectEntity(project_id=pid, entity_id="ENT-001", relationship_role="CONTRACTOR"))
    test_db.commit()

    c_engine = ContractorIntelligenceEngine(min_projects_for_baseline=3)
    profile = c_engine.build_profile("ENT-001", test_db)

    assert profile is not None
    assert profile.total_projects == 5
    assert profile.primary_sector == "Roads"
    assert profile.sector_distribution.get("Roads") == 1.0
    assert profile.median_project_value > 0

    # Sector evaluation for a new Road project (Established Sector)
    eval_road = c_engine.evaluate_sector_specialization(profile, "Roads")
    assert eval_road["signal"] == "ESTABLISHED_SECTOR"
    assert eval_road["score"] == 0.0

    # Sector evaluation for an unprecedented sector e.g. Water (Sector Deviation)
    eval_water = c_engine.evaluate_sector_specialization(profile, "Water Infrastructure")
    assert eval_water["signal"] == "SECTOR_DEVIATION"
    assert eval_water["score"] > 0.0
    assert "contextual review" in eval_water["reason"]


def test_price_aware_cost_normalization(test_db):
    # Seed verified DPIIT/WPI indices: 2020=100.0, 2024=133.5 for ROADS
    test_db.add(PriceIndexRecord(
        index_code="WPI_ROADS",
        category="ROADS",
        year=2020,
        index_value=100.0,
        base_year=2020,
        source_name="Ministry of Commerce & Industry DPIIT",
    ))
    test_db.add(PriceIndexRecord(
        index_code="WPI_ROADS",
        category="ROADS",
        year=2024,
        index_value=133.5,
        base_year=2020,
        source_name="Ministry of Commerce & Industry DPIIT",
    ))
    test_db.commit()

    provider = PriceIndexProvider(db=test_db)
    normalizer = CostNormalizationEngine(base_year=2024, tolerance_band=0.20)

    # Sanctioned in 2020 for ₹10,00,000 -> Should normalize to ~₹13,35,000 in 2024 base year
    norm_res = normalizer.normalize_cost(1000000.0, "Roads", 2020, provider)
    assert norm_res["is_adjusted"] is True
    assert norm_res["adjustment_factor"] == 1.335
    assert norm_res["adjusted_cost"] == 1335000.0
    assert norm_res["provenance"]["source"] == "Ministry of Commerce & Industry DPIIT"

    # Evaluate cost deviation against adjusted peer median
    dev_res = normalizer.evaluate_cost_deviation(1350000.0, 1335000.0, norm_res)
    assert dev_res["signal"] == "WITHIN_EXPECTED_RANGE"
    assert dev_res["score"] == 0.0

    # Test Graceful Fallback when index is unavailable
    norm_res_fallback = normalizer.normalize_cost(1000000.0, "UnknownCategory", 2010, provider)
    assert norm_res_fallback["is_adjusted"] is False
    assert "unavailable" in norm_res_fallback["reason"].lower()


def test_semantic_nlp_hybrid_retrieval():
    engine = SemanticNLPEngine(top_k=5)

    df = pd.DataFrame([
        {
            "project_id": "P-101",
            "normalized_description": "construction of cement concrete cc road and side drain",
            "district": "Jaipur",
        },
        {
            "project_id": "P-102",
            "normalized_description": "laying of cement concrete cc street pavement and roadside drainage",
            "district": "Jaipur",
        },
        {
            "project_id": "P-103",
            "normalized_description": "installation of solar powered drinking water tubewell and overhead storage tank",
            "district": "Udaipur",
        },
    ])

    results = engine.analyze_hybrid(df)
    assert "P-101" in results
    assert "P-102" in results
    assert "P-103" in results

    # P-101 should retrieve P-102 as top candidate
    p101_res = results["P-101"]
    top_cands = p101_res["evidence"]["top_candidates"]
    assert len(top_cands) > 0
    assert top_cands[0]["project_id"] == "P-102"
    assert top_cands[0]["similarity"] > 0.15
    # P-103 is distinct
    assert results["P-103"]["signal"] in ["UNIQUE_DESCRIPTION", "MODERATE_TEXT_SIMILARITY"]



def test_incremental_change_detector(test_db):
    # Pre-populate 1 existing project
    p = Project(project_id="P-EXIST-1", sector="Roads", status="Sanctioned")
    test_db.add(p)
    test_db.add(ProjectFinancial(project_id="P-EXIST-1", sanctioned_amount=500000.0, expenditure=0.0))
    test_db.commit()

    detector = IncrementalChangeDetector(db=test_db)

    incoming_df = pd.DataFrame([
        # 1. Unchanged
        {"project_id": "P-EXIST-1", "sector": "Roads", "status": "Sanctioned", "sanctioned_amount": 500000.0, "expenditure": 0.0},
        # 2. New project
        {"project_id": "P-NEW-2", "sector": "Water", "status": "Sanctioned", "sanctioned_amount": 800000.0, "expenditure": 0.0},
    ])

    det_res = detector.detect_changes(incoming_df, dataset_version="TEST-V2")
    assert det_res["summary"]["new"] == 1
    assert det_res["summary"]["unchanged"] == 1
    assert len(det_res["new_records"]) == 1
    assert len(det_res["unchanged_records"]) == 1


def test_investigation_copilot_service(test_db):
    # Seed project with full relationships
    p = Project(project_id="P-HERO-1", sector="Roads", district="Jaipur", state="Rajasthan", status="In Progress")
    test_db.add(p)
    test_db.add(ProjectFinancial(project_id="P-HERO-1", sanctioned_amount=2500000.0, expenditure=500000.0, utilization_ratio=0.20))
    test_db.add(ProjectLocation(project_id="P-HERO-1", latitude=26.9124, longitude=75.7873, has_valid_coords=True))
    test_db.add(ProjectDescription(project_id="P-HERO-1", title="Community Road Work", description_text="Road construction"))
    test_db.add(RiskScore(
        project_id="P-HERO-1",
        unified_score=78.5,
        priority_level=RiskPriorityEnum.HIGH,
        explanation_summary="High priority review due to low expenditure velocity and timeline delay.",
    ))
    test_db.commit()

    copilot = InvestigationCopilotService()
    brief = copilot.synthesize_investigation_brief("P-HERO-1", user_query="Why was this project prioritized?", db=test_db)

    assert brief["project_id"] == "P-HERO-1"
    assert brief["priority_level"] == "HIGH"
    assert len(brief["observations"]) > 0
    assert len(brief["grounded_guideline_clauses"]) > 0
    assert len(brief["recommended_next_checks"]) > 0
    assert "fraud" not in brief["disclaimer"].lower() or "does not establish" in brief["disclaimer"].lower()

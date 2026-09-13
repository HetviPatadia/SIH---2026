import datetime
import pandas as pd
from typing import Dict, Any, List
from sqlalchemy.orm import Session

from backend.app.database.models import (
    Project,
    ProjectLocation,
    ProjectFinancial,
    ProjectTimeline,
    ProjectDescription,
    Entity,
    ProjectEntity,
    AnalysisRun,
    RiskScore,
    AnomalySignal,
    InvestigationCase,
    EvidenceSignal,
    EvidenceConfidence,
    RiskPriorityEnum,
    InvestigationStatusEnum,
    ProjectAnalysisHistory,
    ContractorProfile,
)
from backend.app.utils.logger import logger

from ai.features.engineer import FeatureEngineer
from ai.financial.engine import FinancialAnomalyEngine
from ai.financial.cost_normalizer import CostNormalizationEngine, PriceIndexProvider
from ai.contractor.profile_engine import ContractorIntelligenceEngine
from ai.temporal.engine import TemporalAnomalyEngine
from ai.nlp.engine import NLPSimilarityEngine
from ai.nlp.semantic_engine import SemanticNLPEngine
from ai.spatial.engine import SpatialAnomalyEngine
from ai.network.engine import NetworkGraphEngine
from ai.features.split_tender import SplitTenderEngine
from ai.fusion.engine import MultiModalFusionEngine
from ai.risk.engine import UnifiedRiskEngine
from ai.explainability.shap_engine import ExplainableAIEngine
from ai.explainability.evidence import AuditEvidenceEngine

class AnalysisOrchestrator:
    """
    Coordinates multi-modal AI execution across all analytical engines:
    Financial, Temporal, Hybrid Lexical+Semantic NLP, Spatial,
    Contractor Nexus, Split-Tender, Contractor Longitudinal Profiling,
    Price-Aware Cost Normalization, and Multi-Signal Fusion.
    Computes fused 0-100 audit priority scores and records snapshot history.
    """

    def __init__(self):
        self.feature_eng = FeatureEngineer()
        self.fin_engine = FinancialAnomalyEngine()
        self.cost_normalizer = CostNormalizationEngine()
        self.contractor_engine = ContractorIntelligenceEngine()
        self.temp_engine = TemporalAnomalyEngine()
        self.nlp_engine = NLPSimilarityEngine()
        self.semantic_nlp = SemanticNLPEngine()
        self.spatial_engine = SpatialAnomalyEngine()
        self.network_engine = NetworkGraphEngine()
        self.split_engine = SplitTenderEngine()
        self.fusion_engine = MultiModalFusionEngine()
        self.risk_engine = UnifiedRiskEngine()
        self.xai_engine = ExplainableAIEngine()
        self.evidence_engine = AuditEvidenceEngine()


    def run_pipeline(
        self,
        df: pd.DataFrame,
        dataset_version: str,
        db: Session,
        model_version: str = "model_v1.0"
    ) -> Dict[str, Any]:
        run_id = f"run_{dataset_version}_{datetime.datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        logger.info(f"Initiating AI Analysis Pipeline [Run ID: {run_id}] for {len(df)} projects...")

        # 1. Feature Engineering
        feat_df = self.feature_eng.extract_features(df)

        # 2. Run Analytical Engines
        logger.info("Executing Price-Aware Cost Normalization Engine...")
        price_provider = PriceIndexProvider(db=db)
        cost_norm_results = {}
        for _, row in feat_df.iterrows():
            pid = str(row["project_id"])
            sanc_amt = float(row.get("sanctioned_amount", 0.0))
            sec = str(row.get("sector", ""))
            sanc_date = row.get("sanction_date")
            sanc_yr = sanc_date.year if pd.notna(sanc_date) and hasattr(sanc_date, "year") else None
            norm_res = self.cost_normalizer.normalize_cost(sanc_amt, sec, sanc_yr, price_provider)
            peer_med = float(row.get("sector_median_cost", sanc_amt))
            cost_norm_results[pid] = self.cost_normalizer.evaluate_cost_deviation(sanc_amt, peer_med, norm_res)

        logger.info("Executing Financial Anomaly Engine (Price & Context-Aware)...")
        fin_results = self.fin_engine.analyze(feat_df, cost_norm_results=cost_norm_results)

        logger.info("Executing Temporal Velocity Engine...")
        temp_results = self.temp_engine.analyze(feat_df)

        logger.info("Executing Hybrid Lexical + Semantic NLP Engine...")
        nlp_results = self.semantic_nlp.analyze_hybrid(feat_df)

        logger.info("Executing Spatial Geo-Deduplication Engine...")
        spatial_results = self.spatial_engine.analyze(feat_df)

        logger.info("Executing Contractor Nexus Graph Engine...")
        net_results = self.network_engine.analyze(feat_df)

        logger.info("Executing Split-Tender Engine...")
        split_results = self.split_engine.analyze(feat_df)


        # 3. Create Analysis Run Record
        analysis_run = AnalysisRun(
            run_id=run_id,
            dataset_version=dataset_version,
            model_version=model_version,
            status="RUNNING",
            total_analyzed=len(df),
            started_at=datetime.datetime.utcnow(),
        )
        db.add(analysis_run)
        db.flush()

        # 4. Multi-Modal Fusion, Scoring, and DB Population
        flagged_count = 0
        high_critical_count = 0

        for _, row in feat_df.iterrows():
            pid = str(row["project_id"])

            p_fin = fin_results.get(pid, {})
            p_temp = temp_results.get(pid, {})
            p_nlp = nlp_results.get(pid, {})
            p_spat = spatial_results.get(pid, {})
            p_net = net_results.get("project_scores", {}).get(pid, {})
            p_split = split_results.get(pid, {})

            # Query any attached physical evidence signals for this project
            p_ev_signals = db.query(EvidenceSignal).filter(EvidenceSignal.project_id == pid).all()
            if p_ev_signals:
                # Filter for actual irregularity signals (do NOT treat INSUFFICIENT_EVIDENCE as an irregularity!)
                irreg_signals = [
                    s for s in p_ev_signals
                    if s.signal_type not in ["INSUFFICIENT_EVIDENCE", "COMPLIANT", "NORMAL"]
                ]
                if irreg_signals:
                    max_ev_conf = max([s.confidence for s in irreg_signals], default=0.0)
                    primary_sig = irreg_signals[0].signal_type
                    primary_exp = irreg_signals[0].explanation
                    p_ev = {
                        "available": True,
                        "score": round(max_ev_conf / 100.0, 4),
                        "status": "EVIDENCE_PRESENT",
                        "signal": primary_sig,
                        "signals": [s.signal_type for s in p_ev_signals],
                        "explanation": primary_exp,
                        "evidence_count": len(p_ev_signals),
                    }
                else:
                    p_ev = {
                        "available": True,
                        "score": 0.0,
                        "status": "EVIDENCE_PRESENT",
                        "signal": "COMPLIANT_OR_INSUFFICIENT",
                        "signals": [s.signal_type for s in p_ev_signals],
                        "explanation": "Asset photographs verified or insufficient for conclusive anomaly scoring.",
                        "evidence_count": len(p_ev_signals),
                    }
            else:
                p_ev = {
                    "available": False,
                    "score": 0.0,
                    "status": "NO_EVIDENCE",
                    "signal": "UNAVAILABLE",
                    "signals": [],
                    "explanation": "No physical asset evidence photographs uploaded.",
                    "evidence_count": 0,
                }

            # Query EvidenceConfidence separately (completeness & reliability, NOT anomaly)
            ev_conf_rec = db.query(EvidenceConfidence).filter(EvidenceConfidence.project_id == pid).first()
            ev_conf_val = float(ev_conf_rec.overall_confidence) if ev_conf_rec else None

            # Multi-Modal Fusion across all 7 analytical domains
            fused = self.fusion_engine.fuse(
                pid, p_fin, p_temp, p_nlp, p_spat, p_net, split_res=p_split, evidence_res=p_ev
            )
            composite_idx = fused["composite_index"]
            contributions = fused["contributions"]
            domain_signals = fused.get("domain_signals", {})
            domains_available = fused.get("domains_available", {})

            # Unified Risk Priority Score
            score_100, level_str = self.risk_engine.calculate_priority(composite_idx)
            priority_enum = getattr(RiskPriorityEnum, level_str, RiskPriorityEnum.LOW)
            explanation = self.risk_engine.generate_explanation_summary(
                level_str, contributions, domain_signals=domain_signals
            )
            top_reasons = self.risk_engine.extract_top_reasons(
                contributions, domain_signals=domain_signals, max_reasons=4
            )

            engine_payload = {
                "financial": p_fin,
                "spatial": p_spat,
                "text": p_nlp,
                "network": p_net,
                "temporal": p_temp,
                "split_tender": p_split,
                "evidence": p_ev,
            }

            # XAI Feature Contributions (SHAP style)
            feature_breakdown = self.xai_engine.compute_contributions(
                row.to_dict(),
                engine_payload,
                contributions,
            )

            # Evidence Compilation
            evidence_items = self.evidence_engine.compile_evidence(
                pid,
                engine_payload,
            )

            if level_str in ["HIGH", "CRITICAL"]:
                flagged_count += 1
                high_critical_count += 1
            elif level_str == "MEDIUM":
                flagged_count += 1

            # Check if project exists or create new
            existing_proj = db.query(Project).filter(Project.project_id == pid).first()
            if not existing_proj:
                project_obj = Project(
                    project_id=pid,
                    dataset_version=dataset_version,
                    state=str(row.get("state", "")),
                    district=str(row.get("district", "")),
                    constituency=str(row.get("constituency", "")),
                    mp_name=str(row.get("mp_name", "")),
                    sector=str(row.get("sector", "")),
                    status=str(row.get("status", "Sanctioned")),
                )
                db.add(project_obj)
                db.flush()

                # Location
                db.add(ProjectLocation(
                    project_id=pid,
                    block=str(row.get("block", "")),
                    village=str(row.get("village", "")),
                    location_name=str(row.get("village", "")),
                    latitude=float(row["latitude"]) if pd.notna(row.get("latitude")) else None,
                    longitude=float(row["longitude"]) if pd.notna(row.get("longitude")) else None,
                    has_valid_coords=bool(row.get("has_valid_coords", False)),
                ))

                # Financial
                db.add(ProjectFinancial(
                    project_id=pid,
                    sanctioned_amount=float(row.get("sanctioned_amount", 0.0)),
                    estimated_cost=float(row.get("estimated_cost", 0.0)),
                    expenditure=float(row.get("expenditure", 0.0)),
                    utilization_ratio=float(row.get("utilization_ratio", 0.0)),
                ))

                # Timeline
                db.add(ProjectTimeline(
                    project_id=pid,
                    sanction_date=row.get("sanction_date") if pd.notna(row.get("sanction_date")) else None,
                    start_date=row.get("start_date") if pd.notna(row.get("start_date")) else None,
                    completion_date=row.get("completion_date") if pd.notna(row.get("completion_date")) else None,
                    duration_days=int(row.get("total_duration_days", -1)),
                ))

                # Description
                db.add(ProjectDescription(
                    project_id=pid,
                    title=str(row.get("title", "")),
                    description_text=str(row.get("description", "")),
                    normalized_text=str(row.get("normalized_description", "")),
                ))

                # Contractor Entity Link
                cname = str(row.get("contractor_name", "")).strip()
                if cname and cname != "nan":
                    entity = db.query(Entity).filter(Entity.name == cname).first()
                    if not entity:
                        entity = Entity(
                            entity_id=f"ent_{abs(hash(cname)) % 1000000:06d}",
                            name=cname,
                            entity_type="CONTRACTOR",
                            primary_district=str(row.get("district", "")),
                        )
                        db.add(entity)
                        db.flush()

                    db.add(ProjectEntity(
                        project_id=pid,
                        entity_id=entity.entity_id,
                        relationship_role="CONTRACTOR",
                    ))

            # Upsert Risk Score
            existing_score = db.query(RiskScore).filter(RiskScore.project_id == pid).first()
            if existing_score:
                existing_score.run_id = run_id
                existing_score.unified_score = score_100
                existing_score.priority_level = priority_enum
                existing_score.financial_contribution = contributions.get("financial", 0.0)
                existing_score.temporal_contribution = contributions.get("temporal", 0.0)
                existing_score.text_contribution = contributions.get("text", 0.0)
                existing_score.spatial_contribution = contributions.get("spatial", 0.0)
                existing_score.network_contribution = contributions.get("network", 0.0)
                existing_score.explanation_summary = explanation
                score_breakdown_payload = {
                    "features": feature_breakdown,
                    "evidence": evidence_items,
                    "split_tender_contribution": contributions.get("split_tender", 0.0),
                    "evidence_contribution": contributions.get("evidence", 0.0),
                    "top_reasons": top_reasons,
                    "domains_available": domains_available,
                    "domain_signals": domain_signals,
                    "evidence_confidence": ev_conf_val,
                    "dataset_version": dataset_version,
                    "model_version": model_version,
                    "audit_disclaimer": (
                        "This score prioritizes projects for human review and does not establish fraud, misconduct, or legal liability. Requires human verification."
                    ),
                }

                existing_score.evidence_breakdown = score_breakdown_payload
                existing_score.calculated_at = datetime.datetime.utcnow()
            else:
                score_breakdown_payload = {
                    "features": feature_breakdown,
                    "evidence": evidence_items,
                    "split_tender_contribution": contributions.get("split_tender", 0.0),
                    "evidence_contribution": contributions.get("evidence", 0.0),
                    "top_reasons": top_reasons,
                    "domains_available": domains_available,
                    "domain_signals": domain_signals,
                    "evidence_confidence": ev_conf_val,
                    "dataset_version": dataset_version,
                    "model_version": model_version,
                    "audit_disclaimer": (
                        "This score prioritizes projects for human review and does not establish fraud, misconduct, or legal liability. Requires human verification."
                    ),
                }

                db.add(RiskScore(
                    project_id=pid,
                    run_id=run_id,
                    unified_score=score_100,
                    priority_level=priority_enum,
                    financial_contribution=contributions.get("financial", 0.0),
                    temporal_contribution=contributions.get("temporal", 0.0),
                    text_contribution=contributions.get("text", 0.0),
                    spatial_contribution=contributions.get("spatial", 0.0),
                    network_contribution=contributions.get("network", 0.0),
                    explanation_summary=explanation,
                    evidence_breakdown=score_breakdown_payload,
                    calculated_at=datetime.datetime.utcnow(),
                ))

            # Record Longitudinal Project Analysis History Snapshot
            prev_history = (
                db.query(ProjectAnalysisHistory)
                .filter(ProjectAnalysisHistory.project_id == pid)
                .order_by(ProjectAnalysisHistory.recorded_at.desc())
                .first()
            )
            prev_score = prev_history.audit_priority_score if prev_history else None
            score_delta = round(score_100 - prev_score, 2) if prev_score is not None else 0.0

            db.add(ProjectAnalysisHistory(
                project_id=pid,
                run_id=run_id,
                dataset_version=dataset_version,
                model_version=model_version,
                audit_priority_score=score_100,
                priority_level=level_str,
                previous_score=prev_score,
                score_delta=score_delta,
                signals_snapshot=domain_signals,
                contributing_factors=contributions,
                change_summary=explanation,
                recorded_at=datetime.datetime.utcnow(),
            ))

            # Auto-create investigation case for HIGH and CRITICAL priority projects
            if level_str in ["HIGH", "CRITICAL"]:
                case_id = f"CASE-{pid}"
                existing_case = db.query(InvestigationCase).filter(InvestigationCase.case_id == case_id).first()
                if not existing_case:
                    db.add(InvestigationCase(
                        case_id=case_id,
                        project_id=pid,
                        status=InvestigationStatusEnum.NEW,
                        priority=level_str,
                    ))

        # 5. Update Longitudinal Contractor Profiles
        logger.info("Updating Contractor Intelligence Profiles...")
        contractor_entities = db.query(Entity).filter(Entity.entity_type == "CONTRACTOR").all()
        for c_ent in contractor_entities:
            try:
                self.contractor_engine.build_profile(c_ent.entity_id, db)
            except Exception as ce:
                logger.warning(f"Error profiling contractor {c_ent.name}: {ce}")

        # Finalize Analysis Run
        analysis_run.status = "COMPLETED"
        analysis_run.anomalies_flagged = flagged_count
        analysis_run.completed_at = datetime.datetime.utcnow()
        db.commit()


        logger.info(
            f"Analysis completed successfully for {len(df)} projects. "
            f"High/Critical Priority Flags: {high_critical_count}, Total Flagged: {flagged_count}"
        )

        return {
            "run_id": run_id,
            "total_analyzed": len(df),
            "flagged_count": flagged_count,
            "high_critical_count": high_critical_count,
            "status": "COMPLETED",
        }

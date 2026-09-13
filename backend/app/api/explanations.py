from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.database.connection import get_db
from backend.app.database.models import Project, RiskScore, AnomalySignal
from backend.app.schemas.anomaly import (
    RiskExplanationResponse,
    FeatureContribution,
    EvidenceItem,
    AnomalySignalDetail,
    TopReasonItem,
)

router = APIRouter(prefix="/api/explanations", tags=["Explainable AI (XAI) API"])

@router.get("/{project_id}", response_model=RiskExplanationResponse)
def get_project_explanation(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.project_id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found")

    risk = db.query(RiskScore).filter(RiskScore.project_id == project_id).first()
    if not risk:
        raise HTTPException(status_code=404, detail=f"No risk score computed yet for '{project_id}'")

    signals = db.query(AnomalySignal).filter(AnomalySignal.project_id == project_id).all()
    signal_details = [
        AnomalySignalDetail(
            engine_name=s.engine_name,
            signal_type=s.signal_type,
            severity=s.severity,
            score=s.score,
            reason=s.reason,
            evidence=s.evidence,
        )
        for s in signals
    ]

    breakdown = risk.evidence_breakdown or {}
    raw_features = breakdown.get("features", [])
    feature_items = [
        FeatureContribution(
            feature=f.get("feature", ""),
            value=f.get("value", ""),
            contribution=f.get("contribution", 0.0),
            direction=f.get("direction", "NEUTRAL"),
            importance=f.get("importance", 0.0),
        )
        for f in raw_features
    ]

    raw_evidence = breakdown.get("evidence", [])
    evidence_items = [
        EvidenceItem(
            signal=e.get("signal", ""),
            finding=e.get("finding", ""),
            evidence_data=e.get("evidence_data", {}),
        )
        for e in raw_evidence
    ]

    level_str = risk.priority_level.value if hasattr(risk.priority_level, "value") else str(risk.priority_level)

    # Synthesize human-readable cross-domain "Why Flagged?" bullet points
    why_flagged: list[str] = []
    for s in signals:
        if s.severity in ["MEDIUM", "HIGH", "CRITICAL"] and s.reason:
            clean_reason = s.reason.rstrip(".")
            why_flagged.append(f"[{s.engine_name.upper()}] {clean_reason}.")

    # If evidence or split tender is recorded in breakdown
    split_contrib = breakdown.get("split_tender_contribution", 0.0)
    ev_contrib = breakdown.get("evidence_contribution", 0.0)

    for item in evidence_items:
        if item.finding and not any(item.finding in wf for wf in why_flagged):
            why_flagged.append(f"[{item.signal}] {item.finding}")

    if not why_flagged:
        why_flagged.append("No active risk flags. Project metrics align with normal historical distributions.")

    # Top Reasons
    top_reasons: List[TopReasonItem] = []
    if "top_reasons" in breakdown and breakdown["top_reasons"]:
        top_reasons = [
            TopReasonItem(
                domain=r.get("domain", "analytical"),
                reason=r.get("reason", ""),
                contribution=float(r.get("contribution", 0.0)),
            )
            for r in breakdown["top_reasons"]
        ]
    else:
        contrib_map = {
            "financial": risk.financial_contribution,
            "temporal": risk.temporal_contribution,
            "text": risk.text_contribution,
            "spatial": risk.spatial_contribution,
            "network": risk.network_contribution,
            "split_tender": split_contrib,
            "evidence": ev_contrib,
        }
        from ai.risk.engine import UnifiedRiskEngine
        risk_eng = UnifiedRiskEngine()
        extracted = risk_eng.extract_top_reasons(contrib_map, max_reasons=4)
        top_reasons = [
            TopReasonItem(
                domain=r["domain"],
                reason=r["reason"],
                contribution=r["contribution"],
            )
            for r in extracted
        ]

    # Domain Availability
    domains_avail = breakdown.get("domains_available")
    if not domains_avail:
        domains_avail = {
            "financial": True,
            "temporal": bool(project.timeline),
            "text": bool(project.description),
            "spatial": bool(project.location and project.location.has_valid_coords),
            "network": bool(project.entities),
            "split_tender": True,
            "evidence": bool(project.evidences),
        }

    # Evidence Confidence (separate from audit priority)
    ev_conf_val = breakdown.get("evidence_confidence")
    if ev_conf_val is None:
        from backend.app.database.models import EvidenceConfidence
        ev_conf_rec = db.query(EvidenceConfidence).filter(EvidenceConfidence.project_id == project_id).first()
        if ev_conf_rec:
            ev_conf_val = float(ev_conf_rec.overall_confidence)

    # Explanation summary fallback to data-driven phrasing
    explanation_summary = risk.explanation_summary
    if not explanation_summary or "administrative parameters" in explanation_summary:
        from ai.risk.engine import UnifiedRiskEngine
        risk_eng = UnifiedRiskEngine()
        explanation_summary = risk_eng.generate_explanation_summary(level_str, contrib_map)

    return RiskExplanationResponse(
        project_id=project_id,
        unified_score=risk.unified_score,
        priority_level=level_str,
        financial_contribution=risk.financial_contribution,
        temporal_contribution=risk.temporal_contribution,
        text_contribution=risk.text_contribution,
        spatial_contribution=risk.spatial_contribution,
        network_contribution=risk.network_contribution,
        split_tender_contribution=split_contrib,
        evidence_contribution=ev_contrib,
        explanation_summary=explanation_summary,
        why_flagged=why_flagged,
        signals=signal_details,
        feature_contributions=feature_items,
        evidence=evidence_items,
        top_reasons=top_reasons,
        domains_available=domains_avail,
        domain_signals=breakdown.get("domain_signals"),
        evidence_confidence=ev_conf_val,
        dataset_version=breakdown.get("dataset_version", project.dataset_version),
        model_version=breakdown.get("model_version", "model_v1.0"),
        audit_disclaimer=(
            "This score prioritizes projects for human review and does not establish "
            "fraud, misconduct, or legal liability. Requires human verification."
        ),
    )

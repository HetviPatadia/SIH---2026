import re
from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy.orm import Session, joinedload

from backend.app.database.models import (
    Project,
    Entity,
    ProjectEntity,
    ProjectFinancial,
    ProjectTimeline,
    ProjectDescription,
    RiskScore,
    ProjectAnalysisHistory,
    ContractorProfile,
    ProjectEvidence,
    EvidenceSignal,
)
from ai.financial.cost_normalizer import (
    CostNormalizationEngine,
    PriceIndexProvider,
    SECTOR_COST_DRIVERS,
)
from ai.contractor.profile_engine import ContractorIntelligenceEngine
from backend.app.utils.logger import logger


# Verified Official MPLADS Guidelines Knowledge Base for Grounded RAG
MPLADS_GUIDELINES_CORPUS = [
    {
        "clause_id": "MPLADS-G23-3.1",
        "title": "Permissible Works & Scope",
        "content": (
            "MPLADS funds can be utilized for creation of durable community assets on government land "
            "in areas of national priority such as drinking water, primary education, public health, "
            "sanitation, and roads. Commercial, private, or religious works are strictly prohibited."
        ),
        "category": "ELIGIBILITY",
    },
    {
        "clause_id": "MPLADS-G23-4.2",
        "title": "Split Tendering & Financial Limits",
        "content": (
            "An executing agency must not split large contiguous development works into multiple smaller "
            "quotations or sanctions to circumvent district magistrate tender committee approvals or statutory "
            "e-procurement thresholds."
        ),
        "category": "PROCUREMENT",
    },
    {
        "clause_id": "MPLADS-G23-5.3",
        "title": "Asset Verification & Completion Documentation",
        "content": (
            "Every completed asset must have geotagged and timestamped completion photographs uploaded to "
            "the official portal (eSAKSHI). Fund utilization certificates (UC) cannot be settled without "
            "verified physical completion proof."
        ),
        "category": "EVIDENCE",
    },
    {
        "clause_id": "MPLADS-G23-6.1",
        "title": "Timeline & Delay Justification",
        "content": (
            "Works sanctioned under MPLADS must be completed within 12 to 18 months from the date of financial "
            "sanction. Any project experiencing more than 180 days of unapproved delay requires formal "
            "administrative review and revised cost estimation."
        ),
        "category": "TIMELINE",
    },
    {
        "clause_id": "MPLADS-G23-7.4",
        "title": "Cost Escalation & Price Adjustment",
        "content": (
            "Price escalation for ongoing works must conform to approved state Schedule of Rates (SOR) or "
            "official CPWD/WPI cost indices. Excess expenditure exceeding 10% of sanctioned limit requires "
            "fresh administrative approval and technical audit."
        ),
        "category": "FINANCIAL",
    },
]


class InvestigationCopilotService:
    """
    AI Investigation Copilot & Decision-Support Service:
    - Coordinates structured, deterministic investigation tools across database and AI layers.
    - Grounded RAG over verified MPLADS regulatory guidelines.
    - NEVER produces ungrounded accusations of fraud, corruption, or legal guilt.
    - Strictly produces:
        1. Contextual observations
        2. Supporting analytical signals
        3. Historical contractor & sector baselines
        4. Data gaps / uncertainties (e.g. missing GPS, price index unavailable)
        5. Recommended next verification checks for the human auditor.
    """

    def __init__(self):
        self.cost_normalizer = CostNormalizationEngine()
        self.contractor_engine = ContractorIntelligenceEngine()

    def get_project_context(self, project_id: str, db: Session) -> Dict[str, Any]:
        """
        Tool: Aggregates comprehensive project investigation facts.
        """
        proj = (
            db.query(Project)
            .options(
                joinedload(Project.financial),
                joinedload(Project.timeline),
                joinedload(Project.location),
                joinedload(Project.description),
                joinedload(Project.risk_score),
                joinedload(Project.entities).joinedload(ProjectEntity.entity),
                joinedload(Project.evidences),
                joinedload(Project.evidence_signals),
                joinedload(Project.analysis_history),
            )
            .filter(Project.project_id == project_id)
            .first()
        )
        if not proj:
            return {"error": f"Project {project_id} not found"}

        # Contractor profile
        contractor_info = None
        c_profile_dict = None
        if proj.entities:
            c_entity = proj.entities[0].entity
            contractor_info = {
                "name": c_entity.name,
                "entity_id": c_entity.entity_id,
                "primary_district": c_entity.primary_district,
            }
            c_prof = db.query(ContractorProfile).filter(ContractorProfile.entity_id == c_entity.entity_id).first()
            if not c_prof:
                c_prof = self.contractor_engine.build_profile(c_entity.entity_id, db)
            if c_prof:
                sec_eval = self.contractor_engine.evaluate_sector_specialization(c_prof, proj.sector or "General")
                c_profile_dict = {
                    "normalized_name": c_prof.normalized_name,
                    "total_projects": c_prof.total_projects,
                    "total_sanctioned_amount": c_prof.total_sanctioned_amount,
                    "primary_sector": c_prof.primary_sector,
                    "sector_distribution": c_prof.sector_distribution,
                    "median_project_value": c_prof.median_project_value,
                    "median_duration_days": c_prof.median_duration_days,
                    "historical_high_priority_count": c_prof.historical_high_priority_count,
                    "sector_specialization_eval": sec_eval,
                }

        # Cost context
        price_provider = PriceIndexProvider(db=db)
        sanc_amt = float(proj.financial.sanctioned_amount) if proj.financial else 0.0
        sanc_yr = proj.timeline.sanction_date.year if proj.timeline and proj.timeline.sanction_date else None
        norm_res = self.cost_normalizer.normalize_cost(sanc_amt, proj.sector or "General", sanc_yr, price_provider)

        # Longitudinal History
        history_list = []
        for h in proj.analysis_history[:5]:
            history_list.append({
                "run_id": h.run_id,
                "dataset_version": h.dataset_version,
                "audit_priority_score": h.audit_priority_score,
                "priority_level": h.priority_level,
                "previous_score": h.previous_score,
                "score_delta": h.score_delta,
                "recorded_at": h.recorded_at.isoformat() if h.recorded_at else None,
            })

        # Evidence
        evidence_signals = [
            {
                "signal_type": s.signal_type,
                "severity": s.severity,
                "confidence": s.confidence,
                "explanation": s.explanation,
            }
            for s in proj.evidence_signals
        ]

        # Audit Priority & Signals
        risk_score_val = proj.risk_score.unified_score if proj.risk_score else 0.0
        priority_lvl = (
            proj.risk_score.priority_level.value
            if proj.risk_score and hasattr(proj.risk_score.priority_level, "value")
            else "LOW"
        )
        explanation_summary = proj.risk_score.explanation_summary if proj.risk_score else "Standard review."
        breakdown = proj.risk_score.evidence_breakdown if (proj.risk_score and isinstance(proj.risk_score.evidence_breakdown, dict)) else {}

        return {
            "project_id": proj.project_id,
            "title": proj.description.title if proj.description else "",
            "sector": proj.sector,
            "district": proj.district,
            "state": proj.state,
            "status": proj.status,
            "sanctioned_amount": sanc_amt,
            "expenditure": float(proj.financial.expenditure) if proj.financial else 0.0,
            "utilization_ratio": float(proj.financial.utilization_ratio) if proj.financial else 0.0,
            "audit_priority_score": risk_score_val,
            "priority_level": priority_lvl,
            "explanation_summary": explanation_summary,
            "top_reasons": breakdown.get("top_reasons", []),

            "contractor": contractor_info,
            "contractor_profile": c_profile_dict,
            "cost_context": norm_res,
            "longitudinal_history": history_list,
            "evidence_signals": evidence_signals,
            "evidence_count": len(proj.evidences),
            "coordinates": {
                "latitude": proj.location.latitude if proj.location else None,
                "longitude": proj.location.longitude if proj.location else None,
                "has_valid_coords": proj.location.has_valid_coords if proj.location else False,
            },
        }

    def query_guidelines_rag(self, query_text: str) -> List[Dict[str, Any]]:
        """
        Tool: Grounded RAG matching over official MPLADS guidelines.
        """
        q_lower = query_text.lower()
        matched = []
        for g in MPLADS_GUIDELINES_CORPUS:
            score = 0
            if any(w in g["title"].lower() for w in q_lower.split()):
                score += 2
            if any(w in g["content"].lower() for w in q_lower.split()):
                score += 1
            if score > 0:
                matched.append({
                    "clause_id": g["clause_id"],
                    "title": g["title"],
                    "category": g["category"],
                    "content": g["content"],
                    "relevance_score": score,
                })
        matched.sort(key=lambda x: x["relevance_score"], reverse=True)
        return matched[:3] if matched else [MPLADS_GUIDELINES_CORPUS[0]]

    def synthesize_investigation_brief(
        self,
        project_id: str,
        user_query: Optional[str],
        db: Session,
    ) -> Dict[str, Any]:
        """
        Orchestrates tools and produces a structured, audit-defensible investigation brief.
        """
        ctx = self.get_project_context(project_id, db)
        if "error" in ctx:
            return ctx

        # 1. Observations
        observations = []
        p_cost = ctx["sanctioned_amount"]
        p_sec = ctx["sector"]
        p_score = ctx["audit_priority_score"]
        p_lvl = ctx["priority_level"]

        observations.append(
            f"Project {project_id} ({ctx['title']}) is prioritized at {p_score:.1f}/100 "
            f"({p_lvl} priority level) for administrative verification in {ctx['district']}, {ctx['state']}."
        )

        # Financial observation
        cost_ctx = ctx.get("cost_context", {})
        if cost_ctx.get("is_adjusted"):
            observations.append(
                f"Sanctioned expenditure of ₹{p_cost:,.0f} has been price-adjusted to base year "
                f"equivalent of ₹{cost_ctx.get('adjusted_cost', p_cost):,.0f} (Expected Range: "
                f"₹{cost_ctx.get('expected_min', 0):,.0f} – ₹{cost_ctx.get('expected_max', 0):,.0f})."
            )
        else:
            observations.append(
                f"Sanctioned expenditure of ₹{p_cost:,.0f} evaluated against unadjusted category median."
            )

        # Contractor observation
        c_prof = ctx.get("contractor_profile")
        if c_prof:
            sec_eval = c_prof.get("sector_specialization_eval", {})
            observations.append(
                f"Executing Contractor '{c_prof.get('normalized_name')}' holds a historical portfolio "
                f"of {c_prof.get('total_projects')} projects. {sec_eval.get('reason', '')}"
            )

        # 2. Supporting Signals
        supporting_signals = []
        for r in ctx.get("top_reasons", []):
            supporting_signals.append(r)
        for es in ctx.get("evidence_signals", []):
            supporting_signals.append(f"{es['signal_type']}: {es['explanation']}")

        # 3. Uncertainties & Data Gaps
        data_gaps = []
        if not ctx["coordinates"]["has_valid_coords"]:
            data_gaps.append("Exact GPS coordinates unavailable; spatial proximity analysis is unverified.")
        if ctx["evidence_count"] == 0:
            data_gaps.append("No physical asset verification photographs uploaded to date (eSAKSHI).")
        if not cost_ctx.get("is_adjusted"):
            data_gaps.append("Official price index for sanction year could not be aligned; relying on peer baseline.")
        if not c_prof or c_prof.get("total_projects", 0) < 3:
            data_gaps.append("Limited historical portfolio for executing contractor; longitudinal baseline sample size is small.")

        # 4. Regulatory Guidelines (Grounded RAG)
        relevant_guidelines = self.query_guidelines_rag(user_query or f"{p_sec} cost timeline evidence")

        # 5. Recommended Next Investigative Steps
        recommended_actions = []
        if ctx["evidence_count"] == 0 or ctx.get("evidence_signals"):
            recommended_actions.append("Dispatch field verification officer to capture geotagged milestone photos on-site.")
        if cost_ctx.get("is_adjusted") and p_cost > cost_ctx.get("expected_max", p_cost):
            recommended_actions.append("Request revised item-rate technical estimate and state Schedule of Rates (SOR) comparison.")
        if c_prof and c_prof.get("historical_high_priority_count", 0) > 2:
            recommended_actions.append("Review previous audit inspection notes across contractor's regional works.")
        if not recommended_actions:
            recommended_actions.append("Verify Fund Utilization Certificate against standard milestone completion checklist.")

        return {
            "project_id": project_id,
            "query": user_query or "Comprehensive Audit Synthesis",
            "audit_priority_score": p_score,
            "priority_level": p_lvl,
            "observations": observations,
            "supporting_signals": supporting_signals,
            "data_gaps_and_uncertainties": data_gaps,
            "grounded_guideline_clauses": relevant_guidelines,
            "recommended_next_checks": recommended_actions,
            "disclaimer": (
                "The AI Investigation Copilot synthesizes objective backend signals to support human auditors. "
                "It does NOT establish legal culpability, fraud, or intentional wrongdoing. Final audit conclusions "
                "remain the sole responsibility of the administrative authority."
            ),
            "generated_at": datetime.utcnow().isoformat(),
        }

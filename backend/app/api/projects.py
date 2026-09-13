from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, desc, asc, func, case
from typing import Optional, List
from pathlib import Path
import math
from backend.app.database.connection import get_db
from backend.app.database.models import (
    Project,
    ProjectLocation,
    ProjectFinancial,
    ProjectTimeline,
    ProjectDescription,
    RiskScore,
    ProjectEntity,
    Entity,
    RiskPriorityEnum,
    InvestigationCase,
    InvestigationStatusEnum,
    ProjectEvidence,
    EvidenceSignal,
    ProjectAnalysisHistory,
    ContractorProfile,
)

from backend.app.schemas.project import (
    ProjectResponse,
    PaginatedProjectResponse,
    PublicProjectResponse,
    PaginatedPublicProjectResponse,
)
from backend.app.schemas.map import NearbyProjectsResponse
from backend.app.utils.geo import haversine_distance_km, is_valid_coordinate
from ai.evidence.status import (
    determine_evidence_status,
    EVIDENCE_STATUS_UNAVAILABLE,
    EVIDENCE_STATUS_POTENTIAL_REUSE,
    EVIDENCE_STATUS_LOCATION_INCONSISTENCY,
    EVIDENCE_STATUS_TEMPORAL_INCONSISTENCY,
    EVIDENCE_STATUS_INSUFFICIENT_METADATA,
    EVIDENCE_STATUS_REVIEW_REQUIRED,
    EVIDENCE_STATUS_VERIFIED,
)

router = APIRouter(prefix="/api/projects", tags=["Projects API"])

SIGNAL_LABEL_MAP = {
    "PHYSICAL_PROXIMITY_OVERLAP": "Physical Proximity Overlap",
    "FINANCIAL_DEVIATION": "Financial Deviation",
    "DESCRIPTION_REDUNDANCY": "Description Redundancy",
    "CONTRACTOR_CONCENTRATION": "Contractor Concentration",
    "EXACT_EVIDENCE_REUSE": "Exact Evidence Reuse",
    "POTENTIAL_EVIDENCE_REUSE": "Potential Evidence Reuse",
    "EVIDENCE_LOCATION_INCONSISTENCY": "Location Inconsistency",
    "TEMPORAL_EVIDENCE_INCONSISTENCY": "Temporal Inconsistency",
    "COST_OUTLIER": "Cost Outlier",
    "VELOCITY_SPIKE": "Timeline Velocity Spike",
    "GEO_DUPLICATE": "Geographic Duplicate",
    "INSUFFICIENT_EVIDENCE": "Insufficient Evidence",
}

def derive_why_flagged_and_signals(p: Project) -> tuple[str, List[str]]:
    primary_signals: List[str] = []
    reasons: List[str] = []

    # 1. From risk score explanation and evidence breakdown
    if p.risk_score:
        if p.risk_score.evidence_breakdown and isinstance(p.risk_score.evidence_breakdown, dict):
            ev_list = p.risk_score.evidence_breakdown.get("evidence", [])
            for item in ev_list:
                if isinstance(item, dict):
                    sig = item.get("signal")
                    if sig:
                        label = SIGNAL_LABEL_MAP.get(sig, sig.replace("_", " ").title())
                        if label not in primary_signals:
                            primary_signals.append(label)
                    finding = item.get("finding")
                    if finding and finding not in reasons:
                        reasons.append(finding)

    # 2. From evidence signals if present
    if hasattr(p, "evidence_signals") and p.evidence_signals:
        for s in p.evidence_signals:
            sig = getattr(s, "signal_type", None)
            if sig:
                label = SIGNAL_LABEL_MAP.get(sig, sig.replace("_", " ").title())
                if label not in primary_signals:
                    primary_signals.append(label)
                reason_text = getattr(s, "reason", None)
                if reason_text and reason_text not in reasons:
                    reasons.append(reason_text)

    # 3. Fallback to risk score explanation_summary if no specific findings
    if not reasons and p.risk_score and p.risk_score.explanation_summary:
        reasons.append(p.risk_score.explanation_summary)

    # 4. If still no reasons, provide baseline objective text
    if not reasons:
        why_flagged = "Routine monitoring — metrics align with expected regional distribution."
    else:
        why_flagged = " | ".join(reasons[:2])

    return why_flagged, primary_signals[:5]

def derive_evidence_status(p: Project) -> str:
    if not p.evidences:
        return EVIDENCE_STATUS_UNAVAILABLE

    p_signals = getattr(p, "evidence_signals", []) or []
    statuses: List[str] = []
    for ev in p.evidences:
        meta = getattr(ev, "metadata_record", None)
        file_rec = getattr(ev, "file", None)
        has_file = bool(file_rec and Path(file_rec.file_path).exists())
        has_meta = bool(meta and (meta.has_gps or meta.has_timestamp))
        meta_rel = meta.metadata_reliability if meta else 0.0
        has_gps = bool(meta and meta.has_gps)
        has_time = bool(meta and meta.has_timestamp)

        ev_sigs = [s for s in p_signals if getattr(s, "evidence_id", None) == ev.evidence_id or getattr(s, "evidence_id", None) is None]
        st, _ = determine_evidence_status(
            signals=ev_sigs,
            has_file=has_file,
            has_metadata=has_meta,
            metadata_reliability=meta_rel,
            has_gps=has_gps,
            has_timestamp=has_time,
        )
        statuses.append(st)

    for priority_status in [
        EVIDENCE_STATUS_POTENTIAL_REUSE,
        EVIDENCE_STATUS_LOCATION_INCONSISTENCY,
        EVIDENCE_STATUS_TEMPORAL_INCONSISTENCY,
        EVIDENCE_STATUS_INSUFFICIENT_METADATA,
        EVIDENCE_STATUS_REVIEW_REQUIRED,
        EVIDENCE_STATUS_VERIFIED,
        EVIDENCE_STATUS_UNAVAILABLE,
    ]:
        if priority_status in statuses:
            return priority_status

    return statuses[0] if statuses else EVIDENCE_STATUS_UNAVAILABLE

def format_project_response(p: Project) -> dict:
    risk_summary = None
    audit_priority = 0.0
    priority_level = "LOW"
    if p.risk_score:
        audit_priority = p.risk_score.unified_score
        priority_level = (
            p.risk_score.priority_level.value
            if hasattr(p.risk_score.priority_level, "value")
            else str(p.risk_score.priority_level)
        )
        bd = p.risk_score.evidence_breakdown or {}
        top_reasons = bd.get("top_reasons", [])
        if not top_reasons and p.risk_score.unified_score > 30.0:
            from ai.risk.engine import UnifiedRiskEngine
            risk_eng = UnifiedRiskEngine()
            contrib_map = {
                "financial": p.risk_score.financial_contribution,
                "temporal": p.risk_score.temporal_contribution,
                "text": p.risk_score.text_contribution,
                "spatial": p.risk_score.spatial_contribution,
                "network": p.risk_score.network_contribution,
                "split_tender": bd.get("split_tender_contribution", 0.0),
                "evidence": bd.get("evidence_contribution", 0.0),
            }
            top_reasons = risk_eng.extract_top_reasons(contrib_map, max_reasons=3)

        domains_available = bd.get("domains_available")
        if not domains_available:
            domains_available = {
                "financial": True,
                "temporal": bool(p.timeline),
                "text": bool(p.description),
                "spatial": bool(p.location and p.location.has_valid_coords),
                "network": bool(p.entities),
                "split_tender": True,
                "evidence": bool(p.evidences),
            }

        risk_summary = {
            "unified_score": p.risk_score.unified_score,
            "priority_level": priority_level,
            "explanation_summary": p.risk_score.explanation_summary,
            "calculated_at": p.risk_score.calculated_at,
            "top_reasons": top_reasons,
            "domains_available": domains_available,
            "evidence_confidence": bd.get("evidence_confidence"),
        }

    loc_dict = None
    if p.location:
        loc_dict = {
            "block": p.location.block,
            "village": p.location.village,
            "location_name": p.location.location_name,
            "latitude": p.location.latitude,
            "longitude": p.location.longitude,
            "has_valid_coords": p.location.has_valid_coords,
        }

    fin_dict = None
    if p.financial:
        fin_dict = {
            "sanctioned_amount": p.financial.sanctioned_amount,
            "estimated_cost": p.financial.estimated_cost,
            "expenditure": p.financial.expenditure,
            "utilization_ratio": p.financial.utilization_ratio,
        }

    time_dict = None
    if p.timeline:
        time_dict = {
            "recommendation_date": p.timeline.recommendation_date,
            "sanction_date": p.timeline.sanction_date,
            "start_date": p.timeline.start_date,
            "completion_date": p.timeline.completion_date,
            "duration_days": p.timeline.duration_days,
            "delay_days": p.timeline.delay_days,
        }

    desc = p.description.title if p.description else ""

    # Human-in-the-loop Review and Investigation status derivation
    review_status = "NEW"
    assigned_to = None
    case_id = None
    updated_at = p.created_at

    if p.investigations:
        sorted_cases = sorted(
            p.investigations,
            key=lambda c: c.updated_at or c.created_at or datetime.datetime.min,
            reverse=True,
        )
        case = sorted_cases[0]
        review_status = case.status.value if hasattr(case.status, "value") else str(case.status)
        assigned_to = case.assigned_to
        case_id = case.case_id
        updated_at = case.updated_at or case.created_at
    elif p.risk_score and p.risk_score.calculated_at:
        updated_at = p.risk_score.calculated_at

    why_flagged, primary_signals = derive_why_flagged_and_signals(p)
    evidence_status = derive_evidence_status(p)

    return {
        "project_id": p.project_id,
        "dataset_version": p.dataset_version,
        "state": p.state,
        "district": p.district,
        "constituency": p.constituency,
        "mp_name": p.mp_name,
        "sector": p.sector,
        "status": p.status,
        "description": desc,
        "location": loc_dict,
        "financial": fin_dict,
        "timeline": time_dict,
        "risk_score": risk_summary,
        "audit_priority": audit_priority,
        "priority_level": priority_level,
        "why_flagged": why_flagged,
        "evidence_status": evidence_status,
        "review_status": review_status,
        "assigned_to": assigned_to,
        "case_id": case_id,
        "updated_at": updated_at,
        "primary_signals": primary_signals,
    }

@router.get("", response_model=PaginatedProjectResponse)
def list_projects(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    priority: Optional[str] = None,
    district: Optional[str] = None,
    sector: Optional[str] = None,
    status: Optional[str] = None,
    review_status: Optional[str] = None,
    evidence_status: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = Query("audit_priority", description="Sort field: audit_priority, updated_at, created_at, project_id"),
    sort_order: Optional[str] = Query("desc", description="Sort direction: asc or desc"),
    db: Session = Depends(get_db),
):
    query = db.query(Project)

    # Joins required for filtering, searching, and sorting
    query = query.outerjoin(RiskScore, Project.project_id == RiskScore.project_id)
    query = query.outerjoin(InvestigationCase, Project.project_id == InvestigationCase.project_id)

    # Search filter across project_id, mp_name, district, description, and linked contractor entity
    if search and search.strip():
        s = f"%{search.strip()}%"
        query = query.outerjoin(ProjectDescription, Project.project_id == ProjectDescription.project_id)
        query = query.outerjoin(ProjectEntity, Project.project_id == ProjectEntity.project_id)
        query = query.outerjoin(Entity, ProjectEntity.entity_id == Entity.entity_id)
        query = query.filter(
            or_(
                Project.project_id.ilike(s),
                Project.mp_name.ilike(s),
                Project.district.ilike(s),
                ProjectDescription.title.ilike(s),
                ProjectDescription.description_text.ilike(s),
                Entity.name.ilike(s),
            )
        )

    # District filter
    if district and district.strip():
        query = query.filter(Project.district.ilike(f"%{district.strip()}%"))

    # Sector filter
    if sector and sector.strip():
        query = query.filter(Project.sector.ilike(f"%{sector.strip()}%"))

    # Project execution status filter (e.g. Sanctioned, Completed, Ongoing)
    if status and status.strip():
        query = query.filter(Project.status.ilike(f"%{status.strip()}%"))

    # Review status filter (human-in-the-loop investigation state)
    if review_status and review_status.strip():
        rev_upper = review_status.strip().upper()
        if rev_upper == "NEW":
            # Either InvestigationCase.status is NEW or project has no InvestigationCase record
            query = query.filter(
                or_(
                    InvestigationCase.status == InvestigationStatusEnum.NEW,
                    InvestigationCase.id == None,
                )
            )
        else:
            try:
                st_enum = getattr(InvestigationStatusEnum, rev_upper)
                query = query.filter(InvestigationCase.status == st_enum)
            except AttributeError:
                pass

    # Priority filter: supports single priority or comma-separated e.g. "HIGH,CRITICAL"
    if priority and priority.strip():
        priority_parts = [p.strip().upper() for p in priority.split(",") if p.strip()]
        valid_enums = []
        for p in priority_parts:
            try:
                valid_enums.append(getattr(RiskPriorityEnum, p))
            except AttributeError:
                pass
        if valid_enums:
            query = query.filter(RiskScore.priority_level.in_(valid_enums))

    # Evidence status filter
    if evidence_status and evidence_status.strip():
        ev_upper = evidence_status.strip().upper()
        if ev_upper == EVIDENCE_STATUS_UNAVAILABLE:
            # Projects with no evidence attached
            query = query.filter(~Project.evidences.any())
        elif ev_upper == EVIDENCE_STATUS_POTENTIAL_REUSE:
            # Has evidence signals indicating reuse
            query = query.filter(
                Project.evidences.any(),
                Project.evidence_signals.any(
                    EvidenceSignal.signal_type.in_(["EXACT_EVIDENCE_REUSE", "POTENTIAL_EVIDENCE_REUSE"])
                ),
            )
        elif ev_upper == EVIDENCE_STATUS_LOCATION_INCONSISTENCY:
            query = query.filter(
                Project.evidences.any(),
                Project.evidence_signals.any(
                    EvidenceSignal.signal_type == "EVIDENCE_LOCATION_INCONSISTENCY"
                ),
            )
        elif ev_upper == EVIDENCE_STATUS_TEMPORAL_INCONSISTENCY:
            query = query.filter(
                Project.evidences.any(),
                Project.evidence_signals.any(
                    EvidenceSignal.signal_type == "TEMPORAL_EVIDENCE_INCONSISTENCY"
                ),
            )
        else:
            query = query.filter(Project.evidences.any())

    # Sorting
    is_desc = (sort_order or "desc").lower() == "desc"
    sort_field = (sort_by or "audit_priority").lower()

    if sort_field == "updated_at":
        sort_col = InvestigationCase.updated_at
        query = query.order_by(
            desc(sort_col).nullslast() if is_desc else asc(sort_col).nullsfirst(),
            desc(Project.created_at) if is_desc else asc(Project.created_at),
        )
    elif sort_field == "created_at":
        sort_col = Project.created_at
        query = query.order_by(desc(sort_col) if is_desc else asc(sort_col))
    elif sort_field == "project_id":
        sort_col = Project.project_id
        query = query.order_by(desc(sort_col) if is_desc else asc(sort_col))
    else:
        # Default: audit_priority
        sort_col = RiskScore.unified_score
        query = query.order_by(
            desc(sort_col).nullslast() if is_desc else asc(sort_col).nullsfirst(),
            desc(Project.project_id),
        )

    # Distinct query to prevent duplicate rows from joins
    query = query.distinct()

    total = query.count()
    items = (
        query.options(
            joinedload(Project.location),
            joinedload(Project.financial),
            joinedload(Project.timeline),
            joinedload(Project.description),
            joinedload(Project.risk_score),
            joinedload(Project.investigations),
            joinedload(Project.evidences).joinedload(ProjectEvidence.file),
            joinedload(Project.evidences).joinedload(ProjectEvidence.metadata_record),
            joinedload(Project.evidence_signals),
        )
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [format_project_response(p) for p in items],
    }

@router.get("/high-priority", response_model=List[ProjectResponse])
def get_high_priority_projects(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    projects = (
        db.query(Project)
        .join(RiskScore)
        .filter(RiskScore.priority_level.in_([RiskPriorityEnum.HIGH, RiskPriorityEnum.CRITICAL]))
        .order_by(RiskScore.unified_score.desc())
        .limit(limit)
        .all()
    )
    return [format_project_response(p) for p in projects]

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project_detail(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.project_id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found")
    return format_project_response(project)

@router.get("/{project_id}/nearby", response_model=NearbyProjectsResponse)
def get_nearby_projects(
    project_id: str,
    radius_km: float = Query(5.0, ge=0.1, le=100.0, description="Proximity search radius in kilometers (default: 5.0 km)"),
    limit: Optional[int] = Query(None, ge=1, le=2000, description="Max nearby projects to return"),
    db: Session = Depends(get_db),
):
    project = (
        db.query(Project)
        .options(
            joinedload(Project.location),
            joinedload(Project.financial),
            joinedload(Project.description),
            joinedload(Project.risk_score),
        )
        .filter(Project.project_id == project_id)
        .first()
    )
    if not project or not project.location or not project.location.has_valid_coords:
        return {"project_id": project_id, "nearby": []}

    target_lat = project.location.latitude
    target_lon = project.location.longitude

    if not is_valid_coordinate(target_lat, target_lon):
        return {"project_id": project_id, "nearby": []}

    # Geographic bounding box pre-filter for performance
    # 1 deg lat ~ 111 km; 1 deg lon ~ 111 * cos(lat) km
    lat_delta = radius_km / 111.0
    lon_delta = radius_km / (111.0 * max(0.1, abs(math.cos(math.radians(target_lat)))))

    candidates = (
        db.query(Project)
        .join(ProjectLocation, Project.project_id == ProjectLocation.project_id)
        .options(
            joinedload(Project.location),
            joinedload(Project.financial),
            joinedload(Project.description),
            joinedload(Project.risk_score),
        )
        .filter(
            Project.project_id != project_id,
            ProjectLocation.has_valid_coords == True,
            ProjectLocation.latitude.between(target_lat - lat_delta, target_lat + lat_delta),
            ProjectLocation.longitude.between(target_lon - lon_delta, target_lon + lon_delta),
        )
        .all()
    )

    nearby_list = []
    for c in candidates:
        if not c.location or not is_valid_coordinate(c.location.latitude, c.location.longitude):
            continue

        dist_km = haversine_distance_km(target_lat, target_lon, c.location.latitude, c.location.longitude)
        if dist_km <= radius_km:
            p_score = c.risk_score.unified_score if c.risk_score else 0.0
            p_lvl = (
                c.risk_score.priority_level.value
                if c.risk_score and hasattr(c.risk_score.priority_level, "value")
                else (str(c.risk_score.priority_level) if c.risk_score else "LOW")
            )
            nearby_list.append({
                "project_id": c.project_id,
                "title": c.description.title if c.description else c.project_id,
                "distance_km": round(dist_km, 3),
                "distance_meters": round(dist_km * 1000.0, 1),
                "latitude": c.location.latitude,
                "longitude": c.location.longitude,
                "district": c.district,
                "sector": c.sector,
                "priority_level": p_lvl,
                "audit_priority": p_score,
                "sanctioned_amount": c.financial.sanctioned_amount if c.financial else 0.0,
            })

    nearby_list.sort(key=lambda x: x["distance_km"])
    if limit is not None:
        nearby_list = nearby_list[:limit]
    return {"project_id": project_id, "nearby": nearby_list}


@router.get("/{project_id}/history")
def get_project_history(project_id: str, db: Session = Depends(get_db)):
    """
    Returns the longitudinal score snapshot history and temporal changes for a project across runs.
    """
    proj = db.query(Project).filter(Project.project_id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found")

    history_records = (
        db.query(ProjectAnalysisHistory)
        .filter(ProjectAnalysisHistory.project_id == project_id)
        .order_by(ProjectAnalysisHistory.recorded_at.desc())
        .all()
    )

    snapshots = []
    for h in history_records:
        snapshots.append({
            "run_id": h.run_id,
            "dataset_version": h.dataset_version,
            "model_version": h.model_version,
            "audit_priority_score": h.audit_priority_score,
            "priority_level": h.priority_level,
            "previous_score": h.previous_score,
            "score_delta": h.score_delta,
            "signals_snapshot": h.signals_snapshot,
            "contributing_factors": h.contributing_factors,
            "change_summary": h.change_summary,
            "recorded_at": h.recorded_at.isoformat() if h.recorded_at else None,
        })

    return {
        "project_id": project_id,
        "total_snapshots": len(snapshots),
        "snapshots": snapshots,
    }


@router.get("/{project_id}/cost-context")
def get_project_cost_context(project_id: str, db: Session = Depends(get_db)):
    """
    Returns price-aware cost normalization context, expected range vs observed cost,
    and inflation index provenance.
    """
    from ai.financial.cost_normalizer import CostNormalizationEngine, PriceIndexProvider
    
    proj = (
        db.query(Project)
        .options(
            joinedload(Project.financial),
            joinedload(Project.timeline),
        )
        .filter(Project.project_id == project_id)
        .first()
    )
    if not proj:
        raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found")

    sanc_amt = float(proj.financial.sanctioned_amount) if proj.financial else 0.0
    sanc_yr = proj.timeline.sanction_date.year if proj.timeline and proj.timeline.sanction_date else None
    
    normalizer = CostNormalizationEngine()
    provider = PriceIndexProvider(db=db)
    norm_res = normalizer.normalize_cost(sanc_amt, proj.sector or "General", sanc_yr, provider)

    # Compute sector median
    all_same_sector = (
        db.query(ProjectFinancial.sanctioned_amount)
        .join(Project, ProjectFinancial.project_id == Project.project_id)
        .filter(Project.sector == proj.sector)
        .all()
    )
    if all_same_sector:
        vals = [float(v[0]) for v in all_same_sector if v[0] is not None]
        import numpy as np
        sec_median = float(np.median(vals)) if vals else sanc_amt
    else:
        sec_median = sanc_amt

    dev_res = normalizer.evaluate_cost_deviation(sanc_amt, sec_median, norm_res)

    return {
        "project_id": project_id,
        "sector": proj.sector,
        "sanction_year": sanc_yr,
        "observed_cost": sanc_amt,
        "normalization": norm_res,
        "deviation_evaluation": dev_res,
    }


@router.get("/{project_id}/similar")
def get_similar_projects(
    project_id: str,
    top_k: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """
    Semantic Top-K candidate search for similar projects based on work description.
    """
    from ai.nlp.semantic_engine import SemanticNLPEngine
    import pandas as pd

    proj = (
        db.query(Project)
        .options(joinedload(Project.description))
        .filter(Project.project_id == project_id)
        .first()
    )
    if not proj:
        raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found")

    # Fetch candidate projects (prioritizing same sector or same state/district)
    candidates = (
        db.query(Project)
        .options(
            joinedload(Project.description),
            joinedload(Project.financial),
            joinedload(Project.risk_score),
        )
        .filter(Project.project_id != project_id)
        .limit(200)
        .all()
    )

    if not candidates:
        return {"project_id": project_id, "similar_projects": []}

    rows = []
    # Include target project as first row
    rows.append({
        "project_id": proj.project_id,
        "normalized_description": proj.description.normalized_text if proj.description else proj.sector,
        "district": proj.district or "",
    })
    for c in candidates:
        rows.append({
            "project_id": c.project_id,
            "normalized_description": c.description.normalized_text if c.description else c.sector,
            "district": c.district or "",
        })

    cand_df = pd.DataFrame(rows)
    engine = SemanticNLPEngine(top_k=top_k)
    results = engine.analyze_hybrid(cand_df)
    target_res = results.get(project_id, {})
    top_candidates = target_res.get("evidence", {}).get("top_candidates", [])

    return {
        "project_id": project_id,
        "retrieval_method": "Hybrid Lexical + Semantic Vector Embedding",
        "similar_projects": top_candidates,
    }


# Dedicated Public Projects Explorer API Router (Strictly stripped of internal audit intelligence)
public_router = APIRouter(prefix="/api/public/projects", tags=["Public Projects API"])

def _build_public_project_dict(p: Project) -> dict:
    title = p.description.title if p.description else p.project_id
    desc_text = p.description.description_text if p.description else ""
    contractor = None
    if p.entities:
        for pe in p.entities:
            if pe.entity:
                contractor = pe.entity.name
                break

    loc_dict = None
    if p.location:
        loc_dict = {
            "block": p.location.block,
            "village": p.location.village,
            "location_name": p.location.location_name,
            "latitude": p.location.latitude,
            "longitude": p.location.longitude,
            "has_valid_coords": p.location.has_valid_coords,
        }

    fin_dict = None
    if p.financial:
        fin_dict = {
            "sanctioned_amount": p.financial.sanctioned_amount,
            "estimated_cost": p.financial.estimated_cost,
            "expenditure": p.financial.expenditure,
            "utilization_ratio": p.financial.utilization_ratio,
        }

    time_dict = None
    if p.timeline:
        time_dict = {
            "recommendation_date": p.timeline.recommendation_date,
            "sanction_date": p.timeline.sanction_date,
            "start_date": p.timeline.start_date,
            "completion_date": p.timeline.completion_date,
            "duration_days": p.timeline.duration_days,
            "delay_days": p.timeline.delay_days,
        }

    return {
        "project_id": p.project_id,
        "dataset_version": p.dataset_version or "DEMO-SYNTHETIC-v1",
        "state": p.state,
        "district": p.district,
        "constituency": p.constituency,
        "mp_name": p.mp_name,
        "sector": p.sector,
        "status": p.status,
        "title": title,
        "description": desc_text,
        "location": loc_dict,
        "financial": fin_dict,
        "timeline": time_dict,
        "contractor_name": contractor,
        "public_rating": 4.2,
        "public_rating_count": 24,
    }


@public_router.get("", response_model=PaginatedPublicProjectResponse)
def list_public_projects(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    state: Optional[str] = None,
    district: Optional[str] = None,
    constituency: Optional[str] = None,
    block: Optional[str] = None,
    village: Optional[str] = None,
    sector: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Project)

    if state and state.strip():
        query = query.filter(Project.state.ilike(state.strip()))

    if district and district.strip():
        query = query.filter(Project.district.ilike(f"%{district.strip()}%"))

    if constituency and constituency.strip():
        query = query.filter(Project.constituency.ilike(f"%{constituency.strip()}%"))

    if sector and sector.strip():
        query = query.filter(Project.sector.ilike(f"%{sector.strip()}%"))

    if status and status.strip():
        query = query.filter(Project.status.ilike(f"%{status.strip()}%"))

    if block or village:
        query = query.join(ProjectLocation, Project.project_id == ProjectLocation.project_id)
        if block and block.strip():
            query = query.filter(ProjectLocation.block.ilike(f"%{block.strip()}%"))
        if village and village.strip():
            query = query.filter(ProjectLocation.village.ilike(f"%{village.strip()}%"))

    if search and search.strip():
        s = f"%{search.strip()}%"
        query = query.outerjoin(ProjectDescription, Project.project_id == ProjectDescription.project_id)
        query = query.filter(
            or_(
                Project.project_id.ilike(s),
                Project.mp_name.ilike(s),
                Project.district.ilike(s),
                ProjectDescription.title.ilike(s),
            )
        )

    query = query.order_by(desc(Project.created_at), desc(Project.project_id)).distinct()
    total = query.count()

    items = (
        query.options(
            joinedload(Project.location),
            joinedload(Project.financial),
            joinedload(Project.timeline),
            joinedload(Project.description),
            joinedload(Project.entities).joinedload(ProjectEntity.entity),
        )
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    public_items = [_build_public_project_dict(p) for p in items]

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": public_items,
    }


@public_router.get("/stats")
def get_public_stats(
    state: Optional[str] = None,
    district: Optional[str] = None,
    constituency: Optional[str] = None,
    block: Optional[str] = None,
    village: Optional[str] = None,
    sector: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Returns live summary metrics directly calculated from the auditor database.
    """
    query = db.query(
        func.count(Project.project_id),
        func.coalesce(func.sum(ProjectFinancial.sanctioned_amount), 0.0),
        func.coalesce(func.sum(ProjectFinancial.expenditure), 0.0),
        func.coalesce(func.sum(case((Project.status == "Completed", 1), else_=0)), 0),
        func.coalesce(func.sum(case((Project.status == "In Progress", 1), else_=0)), 0),
    ).outerjoin(ProjectFinancial, Project.project_id == ProjectFinancial.project_id)

    if state and state.strip():
        query = query.filter(Project.state.ilike(state.strip()))
    if district and district.strip():
        query = query.filter(Project.district.ilike(f"%{district.strip()}%"))
    if constituency and constituency.strip():
        query = query.filter(Project.constituency.ilike(f"%{constituency.strip()}%"))
    if sector and sector.strip():
        query = query.filter(Project.sector.ilike(f"%{sector.strip()}%"))
    if status and status.strip():
        query = query.filter(Project.status.ilike(f"%{status.strip()}%"))
    if block or village:
        query = query.join(ProjectLocation, Project.project_id == ProjectLocation.project_id)
        if block and block.strip():
            query = query.filter(ProjectLocation.block.ilike(f"%{block.strip()}%"))
        if village and village.strip():
            query = query.filter(ProjectLocation.village.ilike(f"%{village.strip()}%"))
    if search and search.strip():
        s = f"%{search.strip()}%"
        query = query.outerjoin(ProjectDescription, Project.project_id == ProjectDescription.project_id)
        query = query.filter(
            or_(
                Project.project_id.ilike(s),
                Project.mp_name.ilike(s),
                Project.district.ilike(s),
                ProjectDescription.title.ilike(s),
            )
        )

    row = query.first()
    total_projects = row[0] if row else 0
    total_sanctioned = float(row[1]) if row else 0.0
    total_expenditure = float(row[2]) if row else 0.0
    completed_works = int(row[3]) if row else 0
    in_progress_works = int(row[4]) if row else 0

    return {
        "total_projects": total_projects,
        "total_sanctioned": total_sanctioned,
        "total_expenditure": total_expenditure,
        "completed_works": completed_works,
        "in_progress_works": in_progress_works,
    }


@public_router.get("/map")
def get_public_map_markers(
    state: Optional[str] = None,
    district: Optional[str] = None,
    constituency: Optional[str] = None,
    block: Optional[str] = None,
    village: Optional[str] = None,
    sector: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(1000, ge=1, le=2500),
    db: Session = Depends(get_db),
):
    """
    Returns public geocoded project markers from the auditor database for the map canvas.
    """
    query = (
        db.query(
            Project.project_id,
            Project.state,
            Project.district,
            Project.constituency,
            Project.sector,
            Project.status,
            ProjectDescription.title,
            ProjectLocation.latitude,
            ProjectLocation.longitude,
            ProjectLocation.village,
            ProjectLocation.block,
            ProjectFinancial.sanctioned_amount,
            ProjectFinancial.expenditure,
        )
        .join(ProjectLocation, Project.project_id == ProjectLocation.project_id)
        .outerjoin(ProjectFinancial, Project.project_id == ProjectFinancial.project_id)
        .outerjoin(ProjectDescription, Project.project_id == ProjectDescription.project_id)
        .filter(
            ProjectLocation.has_valid_coords == True,
            ProjectLocation.latitude != None,
            ProjectLocation.longitude != None,
        )
    )

    if state and state.strip():
        query = query.filter(Project.state.ilike(state.strip()))
    if district and district.strip():
        query = query.filter(Project.district.ilike(f"%{district.strip()}%"))
    if constituency and constituency.strip():
        query = query.filter(Project.constituency.ilike(f"%{constituency.strip()}%"))
    if sector and sector.strip():
        query = query.filter(Project.sector.ilike(f"%{sector.strip()}%"))
    if status and status.strip():
        query = query.filter(Project.status.ilike(f"%{status.strip()}%"))
    if block and block.strip():
        query = query.filter(ProjectLocation.block.ilike(f"%{block.strip()}%"))
    if village and village.strip():
        query = query.filter(ProjectLocation.village.ilike(f"%{village.strip()}%"))

    items = query.limit(limit).all()

    markers = []
    for r in items:
        markers.append({
            "project_id": r.project_id,
            "title": r.title or r.project_id,
            "state": r.state,
            "district": r.district,
            "constituency": r.constituency,
            "sector": r.sector,
            "status": r.status,
            "latitude": r.latitude,
            "longitude": r.longitude,
            "location": {
                "latitude": r.latitude,
                "longitude": r.longitude,
                "village": r.village,
                "block": r.block,
            },
            "financial": {
                "sanctioned_amount": r.sanctioned_amount or 0.0,
                "expenditure": r.expenditure or 0.0,
            },
        })

    return markers


@public_router.get("/{project_id}", response_model=PublicProjectResponse)
def get_public_project(project_id: str, db: Session = Depends(get_db)):
    """
    Returns sanitized public details for a single project.
    Strictly excludes internal audit scores, fraud signals, and confidential notes.
    """
    p = (
        db.query(Project)
        .options(
            joinedload(Project.location),
            joinedload(Project.financial),
            joinedload(Project.timeline),
            joinedload(Project.description),
            joinedload(Project.entities).joinedload(ProjectEntity.entity),
        )
        .filter(Project.project_id == project_id)
        .first()
    )
    if not p:
        raise HTTPException(status_code=404, detail=f"Public project '{project_id}' not found.")

    return _build_public_project_dict(p)


from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List, Dict, Any
from backend.app.database.connection import get_db
from backend.app.database.models import (
    Project,
    Entity,
    ProjectEntity,
    RiskScore,
    RiskPriorityEnum,
    EvidenceSignal,
    ProjectEvidence,
    ContractorProfile,
)

from backend.app.schemas.network import (
    NetworkGraphResponse,
    GraphNode,
    GraphEdge,
    ContractorInvestigationResponse,
    ContractorSummary,
)

router = APIRouter(prefix="/api/network", tags=["Network & Contractor Nexus API"])

@router.get("/graph", response_model=NetworkGraphResponse)
def get_network_graph(
    project_id: Optional[str] = Query(None, description="Investigate connections centered around a specific project ID"),
    contractor: Optional[str] = Query(None, description="Filter connections by contractor name"),
    district: Optional[str] = Query(None, description="Filter connections by district"),
    priority: Optional[str] = Query(None, description="Filter projects by priority: LOW, MEDIUM, HIGH, CRITICAL, or HIGH,CRITICAL"),
    node_type: Optional[str] = Query(None, description="Restrict graph scope to specific node types: CONTRACTOR, PROJECT, DISTRICT, EVIDENCE"),
    depth: int = Query(1, ge=1, le=2, description="Exploration depth: 1 for direct links, 2 for extended neighborhood"),
    limit: int = Query(100, ge=10, le=300, description="Maximum number of projects to evaluate for graph construction"),
    limit_projects: Optional[int] = Query(None, ge=10, le=500, description="Backward-compatible alias for limit"),
    db: Session = Depends(get_db),
):
    effective_limit = limit_projects if limit_projects is not None else limit

    # Query projects with outer joins
    query = (
        db.query(Project)
        .outerjoin(RiskScore, Project.project_id == RiskScore.project_id)
        .outerjoin(ProjectEntity, Project.project_id == ProjectEntity.project_id)
        .outerjoin(Entity, ProjectEntity.entity_id == Entity.entity_id)
    )

    # 1. Project-centered filter
    if project_id and project_id.strip():
        query = query.filter(Project.project_id.ilike(f"%{project_id.strip()}%"))

    # 2. Contractor filter
    if contractor and contractor.strip():
        query = query.filter(Entity.name.ilike(f"%{contractor.strip()}%"))

    # 3. District filter
    if district and district.strip():
        query = query.filter(Project.district.ilike(f"%{district.strip()}%"))

    # 4. Priority filter (supports single or comma-separated e.g. "HIGH,CRITICAL")
    if priority and priority.strip():
        parts = [p.strip().upper() for p in priority.split(",") if p.strip()]
        valid_enums = []
        for p in parts:
            try:
                valid_enums.append(getattr(RiskPriorityEnum, p))
            except AttributeError:
                pass
        if valid_enums:
            query = query.filter(RiskScore.priority_level.in_(valid_enums))

    # Fetch projects with eager loading
    projects = (
        query.distinct()
        .options(
            joinedload(Project.entities).joinedload(ProjectEntity.entity),
            joinedload(Project.risk_score),
            joinedload(Project.financial),
            joinedload(Project.description),
        )
        .order_by(RiskScore.unified_score.desc().nullslast(), Project.project_id)
        .limit(effective_limit)
        .all()
    )

    if not projects:
        return NetworkGraphResponse(
            nodes=[],
            edges=[],
            status="SUCCESS",
            reason="No projects or relationships matched the specified query criteria.",
            metrics={
                "node_count": 0,
                "edge_count": 0,
                "project_count": 0,
                "contractor_count": 0,
                "district_count": 0,
                "evidence_count": 0,
            },
        )

    # If depth=2 and we filtered by a specific project or contractor, expand neighborhood
    matched_pids = {p.project_id for p in projects}
    if depth >= 2 and (project_id or contractor):
        # Find contractors on these projects
        c_ids = {pe.entity_id for p in projects for pe in p.entities if pe.entity_id}
        if c_ids:
            extra_projects = (
                db.query(Project)
                .join(ProjectEntity, Project.project_id == ProjectEntity.project_id)
                .filter(ProjectEntity.entity_id.in_(c_ids))
                .options(
                    joinedload(Project.entities).joinedload(ProjectEntity.entity),
                    joinedload(Project.risk_score),
                    joinedload(Project.financial),
                    joinedload(Project.description),
                )
                .limit(effective_limit)
                .all()
            )
            for ep in extra_projects:
                if ep.project_id not in matched_pids:
                    projects.append(ep)
                    matched_pids.add(ep.project_id)

    # Pre-fetch evidence reuse signals for the involved projects to establish real cross-project evidence links
    evidence_signals = (
        db.query(EvidenceSignal)
        .filter(
            EvidenceSignal.project_id.in_(matched_pids),
            EvidenceSignal.signal_type.in_(["EXACT_EVIDENCE_REUSE", "POTENTIAL_EVIDENCE_REUSE"]),
        )
        .all()
    )

    nodes_dict: Dict[str, GraphNode] = {}
    edges_list: List[GraphEdge] = []
    seen_edge_keys = set()

    # Track entity-project counts for relationship weighting and contractor metadata
    contractor_project_counts: Dict[str, int] = {}
    contractor_high_priority_counts: Dict[str, int] = {}
    contractor_scores: Dict[str, List[float]] = {}
    contractor_entities: Dict[str, Entity] = {}

    district_project_counts: Dict[str, int] = {}
    district_scores: Dict[str, List[float]] = {}

    for p in projects:
        score = p.risk_score.unified_score if p.risk_score else 0.0
        p_lvl = (
            p.risk_score.priority_level.value
            if p.risk_score and hasattr(p.risk_score.priority_level, "value")
            else "LOW"
        )
        is_high = p_lvl in ["HIGH", "CRITICAL"]

        # Track district stats
        if p.district:
            d_norm = p.district.strip()
            district_project_counts[d_norm] = district_project_counts.get(d_norm, 0) + 1
            district_scores.setdefault(d_norm, []).append(score)

        # Track contractor stats
        for pe in p.entities:
            if pe.entity:
                c_id = pe.entity.entity_id
                contractor_entities[c_id] = pe.entity
                contractor_project_counts[c_id] = contractor_project_counts.get(c_id, 0) + 1
                contractor_scores.setdefault(c_id, []).append(score)
                if is_high:
                    contractor_high_priority_counts[c_id] = contractor_high_priority_counts.get(c_id, 0) + 1

    # Build Project, Contractor, and District Nodes
    filter_type = node_type.strip().upper() if node_type else None

    for p in projects:
        p_node_id = f"project:{p.project_id}"
        p_score = p.risk_score.unified_score if p.risk_score else 0.0
        p_lvl = (
            p.risk_score.priority_level.value
            if p.risk_score and hasattr(p.risk_score.priority_level, "value")
            else "LOW"
        )

        p_meta = {
            "project_id": p.project_id,
            "district": p.district,
            "sector": p.sector,
            "sanctioned_amount": p.financial.sanctioned_amount if p.financial else 0.0,
            "title": p.description.title if p.description else "",
        }

        if not filter_type or filter_type == "PROJECT":
            if p_node_id not in nodes_dict:
                nodes_dict[p_node_id] = GraphNode(
                    id=p_node_id,
                    label=p.project_id,
                    type="PROJECT",
                    risk_level=p_lvl,
                    score=p_score,
                    metadata=p_meta,
                )

        # Contractor Nodes & AWARDED_TO Edges
        for pe in p.entities:
            if pe.entity:
                ent = pe.entity
                c_node_id = f"contractor:{ent.entity_id}"
                c_p_count = contractor_project_counts.get(ent.entity_id, 1)
                c_avg_score = (
                    round(sum(contractor_scores[ent.entity_id]) / len(contractor_scores[ent.entity_id]), 1)
                    if ent.entity_id in contractor_scores
                    else 0.0
                )
                c_high_count = contractor_high_priority_counts.get(ent.entity_id, 0)

                c_lvl = "CRITICAL" if c_high_count >= 5 else ("HIGH" if c_high_count >= 2 else ("MEDIUM" if c_p_count > 5 else "LOW"))

                if not filter_type or filter_type == "CONTRACTOR":
                    if c_node_id not in nodes_dict:
                        nodes_dict[c_node_id] = GraphNode(
                            id=c_node_id,
                            label=ent.name,
                            type="CONTRACTOR",
                            risk_level=c_lvl,
                            score=c_avg_score,
                            metadata={
                                "entity_id": ent.entity_id,
                                "name": ent.name,
                                "project_count": c_p_count,
                                "average_audit_priority": c_avg_score,
                                "high_priority_projects": c_high_count,
                            },
                        )

                # Edge: CONTRACTOR -> PROJECT
                if (not filter_type) or (filter_type in ["PROJECT", "CONTRACTOR"]):
                    edge_key = (c_node_id, p_node_id, "AWARDED_TO")
                    if edge_key not in seen_edge_keys:
                        seen_edge_keys.add(edge_key)
                        explanation = (
                            f"Project awarded to '{ent.name}'. Repeated association identified across {c_p_count} projects."
                            if c_p_count > 1
                            else f"Project awarded to '{ent.name}'."
                        )
                        edges_list.append(GraphEdge(
                            source=c_node_id,
                            target=p_node_id,
                            relation="AWARDED_TO",
                            weight=float(min(c_p_count, 10)),
                            relationship_count=c_p_count,
                            explanation=explanation,
                        ))

        # District Nodes & LOCATED_IN Edges
        if p.district:
            d_norm = p.district.strip()
            d_node_id = f"district:{d_norm}"
            d_p_count = district_project_counts.get(d_norm, 1)
            d_avg_score = (
                round(sum(district_scores[d_norm]) / len(district_scores[d_norm]), 1)
                if d_norm in district_scores
                else 0.0
            )

            if not filter_type or filter_type == "DISTRICT":
                if d_node_id not in nodes_dict:
                    nodes_dict[d_node_id] = GraphNode(
                        id=d_node_id,
                        label=d_norm,
                        type="DISTRICT",
                        risk_level="LOW",
                        score=d_avg_score,
                        metadata={
                            "district": d_norm,
                            "project_count": d_p_count,
                            "average_audit_priority": d_avg_score,
                        },
                    )

            # Edge: PROJECT -> DISTRICT
            if (not filter_type) or (filter_type in ["PROJECT", "DISTRICT"]):
                edge_key = (p_node_id, d_node_id, "LOCATED_IN")
                if edge_key not in seen_edge_keys:
                    seen_edge_keys.add(edge_key)
                    edges_list.append(GraphEdge(
                        source=p_node_id,
                        target=d_node_id,
                        relation="LOCATED_IN",
                        weight=1.0,
                        relationship_count=1,
                        explanation=f"Project is located in {d_norm} district.",
                    ))

    # Real Evidence Reuse Relationships
    evidence_node_count = 0
    if not filter_type or filter_type in ["EVIDENCE", "PROJECT"]:
        for sig in evidence_signals:
            if not sig.evidence_details or not isinstance(sig.evidence_details, dict):
                continue
            matched_pid = sig.evidence_details.get("matched_project_id")
            if not matched_pid:
                continue

            target_ev_id = sig.evidence_details.get("target_evidence_id") or sig.evidence_id
            matched_ev_id = sig.evidence_details.get("matched_evidence_id")

            # Evidence Node
            if target_ev_id:
                ev_node_id = f"evidence:{target_ev_id}"
                if ev_node_id not in nodes_dict:
                    evidence_node_count += 1
                    nodes_dict[ev_node_id] = GraphNode(
                        id=ev_node_id,
                        label=target_ev_id,
                        type="EVIDENCE",
                        risk_level="HIGH" if sig.signal_type == "EXACT_EVIDENCE_REUSE" else "MEDIUM",
                        score=100.0 if sig.signal_type == "EXACT_EVIDENCE_REUSE" else 75.0,
                        metadata={
                            "evidence_id": target_ev_id,
                            "signal_type": sig.signal_type,
                            "matched_evidence_id": matched_ev_id,
                            "matched_project_id": matched_pid,
                            "similarity_method": sig.evidence_details.get("similarity_method"),
                        },
                    )

                # Edge: PROJECT -> EVIDENCE
                p_src_id = f"project:{sig.project_id}"
                if p_src_id in nodes_dict:
                    edge_key = (p_src_id, ev_node_id, "ASSOCIATED_WITH")
                    if edge_key not in seen_edge_keys:
                        seen_edge_keys.add(edge_key)
                        edges_list.append(GraphEdge(
                            source=p_src_id,
                            target=ev_node_id,
                            relation="ASSOCIATED_WITH",
                            weight=2.0,
                            relationship_count=1,
                            explanation="Evidence photograph registered for this project.",
                        ))

            # Edge: PROJECT -> MATCHED PROJECT (POTENTIAL_EVIDENCE_REUSE)
            p_src_id = f"project:{sig.project_id}"
            p_tgt_id = f"project:{matched_pid}"
            if p_src_id in nodes_dict and p_tgt_id in nodes_dict and p_src_id != p_tgt_id:
                edge_pair = tuple(sorted([p_src_id, p_tgt_id])) + ("POTENTIAL_EVIDENCE_REUSE",)
                if edge_pair not in seen_edge_keys:
                    seen_edge_keys.add(edge_pair)
                    edges_list.append(GraphEdge(
                        source=p_src_id,
                        target=p_tgt_id,
                        relation="POTENTIAL_EVIDENCE_REUSE",
                        weight=3.0,
                        relationship_count=1,
                        explanation=f"Potential evidence photograph reuse detected with peer project {matched_pid}. Requires human verification.",
                    ))

    # Calculate final counts
    counts = {
        "node_count": len(nodes_dict),
        "edge_count": len(edges_list),
        "project_count": sum(1 for n in nodes_dict.values() if n.type == "PROJECT"),
        "contractor_count": sum(1 for n in nodes_dict.values() if n.type == "CONTRACTOR"),
        "district_count": sum(1 for n in nodes_dict.values() if n.type == "DISTRICT"),
        "evidence_count": sum(1 for n in nodes_dict.values() if n.type == "EVIDENCE"),
    }

    return NetworkGraphResponse(
        nodes=list(nodes_dict.values()),
        edges=edges_list,
        status="SUCCESS",
        metrics=counts,
    )

@router.get("/contractor/{name}", response_model=ContractorInvestigationResponse)
def get_contractor_investigation(name: str, db: Session = Depends(get_db)):
    entity = db.query(Entity).filter(Entity.name.ilike(f"%{name.strip()}%")).first()
    if not entity:
        raise HTTPException(status_code=404, detail=f"Contractor '{name}' not found")

    # Fetch all projects associated with this contractor
    project_entities = (
        db.query(ProjectEntity, Project)
        .join(Project, ProjectEntity.project_id == Project.project_id)
        .options(
            joinedload(Project.risk_score),
            joinedload(Project.financial),
            joinedload(Project.description),
        )
        .filter(ProjectEntity.entity_id == entity.entity_id)
        .all()
    )

    project_list = []
    districts = set()
    scores = []
    high_priority_count = 0
    total_sanctioned = 0.0

    nodes_dict: Dict[str, GraphNode] = {}
    edges_list: List[GraphEdge] = []
    seen_edge_keys = set()

    # Contractor Node
    c_node_id = f"contractor:{entity.entity_id}"
    nodes_dict[c_node_id] = GraphNode(
        id=c_node_id,
        label=entity.name,
        type="CONTRACTOR",
        risk_level="MEDIUM",
        score=50.0,
        metadata={
            "entity_id": entity.entity_id,
            "registration_no": entity.registration_no,
            "primary_district": entity.primary_district,
        },
    )

    for pe, proj in project_entities:
        score = proj.risk_score.unified_score if proj.risk_score else 0.0
        scores.append(score)
        level_str = (
            proj.risk_score.priority_level.value
            if proj.risk_score and hasattr(proj.risk_score.priority_level, "value")
            else "LOW"
        )
        if level_str in ["HIGH", "CRITICAL"]:
            high_priority_count += 1

        if proj.district:
            districts.add(proj.district)

        sanc_amount = proj.financial.sanctioned_amount if proj.financial else 0.0
        total_sanctioned += sanc_amount

        # Add to project summary list
        project_list.append({
            "project_id": proj.project_id,
            "district": proj.district,
            "sector": proj.sector,
            "status": proj.status,
            "sanctioned_amount": sanc_amount,
            "audit_priority": score,
            "priority_level": level_str,
            "title": proj.description.title if proj.description else "",
        })

        # Project Node
        p_node_id = f"project:{proj.project_id}"
        if p_node_id not in nodes_dict:
            nodes_dict[p_node_id] = GraphNode(
                id=p_node_id,
                label=f"{proj.project_id} ({proj.district})",
                type="PROJECT",
                risk_level=level_str,
                score=score,
                metadata={
                    "project_id": proj.project_id,
                    "district": proj.district,
                    "sector": proj.sector,
                    "sanctioned_amount": sanc_amount,
                },
            )

        # Edge: CONTRACTOR -> PROJECT
        edge_key = (c_node_id, p_node_id, "AWARDED_TO")
        if edge_key not in seen_edge_keys:
            seen_edge_keys.add(edge_key)
            edges_list.append(GraphEdge(
                source=c_node_id,
                target=p_node_id,
                relation="AWARDED_TO",
                weight=1.0,
                relationship_count=1,
                explanation=f"Contractor assigned to project {proj.project_id}.",
            ))

        # District Node & Edge
        if proj.district:
            d_node_id = f"district:{proj.district}"
            if d_node_id not in nodes_dict:
                nodes_dict[d_node_id] = GraphNode(
                    id=d_node_id,
                    label=proj.district,
                    type="DISTRICT",
                    risk_level="LOW",
                    score=0.0,
                )
            d_edge_key = (p_node_id, d_node_id, "LOCATED_IN")
            if d_edge_key not in seen_edge_keys:
                seen_edge_keys.add(d_edge_key)
                edges_list.append(GraphEdge(
                    source=p_node_id,
                    target=d_node_id,
                    relation="LOCATED_IN",
                    weight=1.0,
                    relationship_count=1,
                    explanation=f"Project executed in {proj.district}.",
                ))

    avg_score = round(sum(scores) / len(scores), 2) if scores else 0.0

    # Update Contractor Node risk_level and score with real aggregates
    nodes_dict[c_node_id].score = avg_score
    nodes_dict[c_node_id].risk_level = (
        "CRITICAL" if high_priority_count >= 5 else ("HIGH" if high_priority_count >= 2 else ("MEDIUM" if len(project_entities) > 5 else "LOW"))
    )

    summary = ContractorSummary(
        total_projects=len(project_entities),
        district_count=len(districts),
        high_priority_projects=high_priority_count,
        average_audit_priority=avg_score,
        total_sanctioned_amount=round(total_sanctioned, 2),
    )

    return ContractorInvestigationResponse(
        contractor=entity.name,
        entity_id=entity.entity_id,
        summary=summary,
        projects=project_list,
        nodes=list(nodes_dict.values()),
        edges=edges_list,
        status="SUCCESS",
        metrics={
            "node_count": len(nodes_dict),
            "edge_count": len(edges_list),
            "project_count": len(project_entities),
            "district_count": len(districts),
        },
    )


@router.get("/contractors/{contractor_id_or_name}/profile")
def get_contractor_profile_endpoint(contractor_id_or_name: str, db: Session = Depends(get_db)):
    """
    Returns the comprehensive longitudinal contractor intelligence profile.
    """
    from ai.contractor.profile_engine import ContractorIntelligenceEngine

    entity = (
        db.query(Entity)
        .filter(
            (Entity.entity_id == contractor_id_or_name)
            | (Entity.name.ilike(f"%{contractor_id_or_name.strip()}%"))
        )
        .first()
    )
    if not entity:
        raise HTTPException(status_code=404, detail=f"Contractor '{contractor_id_or_name}' not found")

    profile = db.query(ContractorProfile).filter(ContractorProfile.entity_id == entity.entity_id).first()
    if not profile:
        c_engine = ContractorIntelligenceEngine()
        profile = c_engine.build_profile(entity.entity_id, db)

    if not profile:
        raise HTTPException(status_code=404, detail=f"Contractor profile for '{entity.name}' could not be generated")

    return {
        "entity_id": profile.entity_id,
        "name": entity.name,
        "normalized_name": profile.normalized_name,
        "aliases": profile.aliases,
        "state": profile.state,
        "primary_district": profile.primary_district,
        "total_projects": profile.total_projects,
        "total_sanctioned_amount": profile.total_sanctioned_amount,
        "primary_sector": profile.primary_sector,
        "sector_distribution": profile.sector_distribution,
        "sector_value_distribution": profile.sector_value_distribution,
        "avg_project_value": profile.avg_project_value,
        "median_project_value": profile.median_project_value,
        "value_mad": profile.value_mad,
        "sector_value_baselines": profile.sector_value_baselines,
        "avg_duration_days": profile.avg_duration_days,
        "median_duration_days": profile.median_duration_days,
        "projects_by_year": profile.projects_by_year,
        "projects_by_status": profile.projects_by_status,
        "projects_by_district": profile.projects_by_district,
        "historical_high_priority_count": profile.historical_high_priority_count,
        "last_updated": profile.last_updated.isoformat() if profile.last_updated else None,
    }


@router.get("/contractors/{contractor_id_or_name}/sectors")
def get_contractor_sectors_endpoint(contractor_id_or_name: str, db: Session = Depends(get_db)):
    """
    Returns the contractor's historical sector specialization breakdown.
    """
    from ai.contractor.profile_engine import ContractorIntelligenceEngine

    entity = (
        db.query(Entity)
        .filter(
            (Entity.entity_id == contractor_id_or_name)
            | (Entity.name.ilike(f"%{contractor_id_or_name.strip()}%"))
        )
        .first()
    )
    if not entity:
        raise HTTPException(status_code=404, detail=f"Contractor '{contractor_id_or_name}' not found")

    profile = db.query(ContractorProfile).filter(ContractorProfile.entity_id == entity.entity_id).first()
    if not profile:
        c_engine = ContractorIntelligenceEngine()
        profile = c_engine.build_profile(entity.entity_id, db)

    return {
        "entity_id": entity.entity_id,
        "contractor_name": entity.name,
        "primary_sector": profile.primary_sector if profile else "General",
        "sector_share_counts": profile.sector_distribution if profile else {},
        "sector_share_values": profile.sector_value_distribution if profile else {},
        "sector_value_baselines": profile.sector_value_baselines if profile else {},
    }


@router.get("/contractors/{contractor_id_or_name}/history")
def get_contractor_history_endpoint(contractor_id_or_name: str, db: Session = Depends(get_db)):
    """
    Returns the timeline and audit outcome history for all projects executed by this contractor.
    """
    entity = (
        db.query(Entity)
        .filter(
            (Entity.entity_id == contractor_id_or_name)
            | (Entity.name.ilike(f"%{contractor_id_or_name.strip()}%"))
        )
        .first()
    )
    if not entity:
        raise HTTPException(status_code=404, detail=f"Contractor '{contractor_id_or_name}' not found")

    project_entities = (
        db.query(ProjectEntity, Project)
        .join(Project, ProjectEntity.project_id == Project.project_id)
        .options(
            joinedload(Project.risk_score),
            joinedload(Project.financial),
            joinedload(Project.timeline),
        )
        .filter(ProjectEntity.entity_id == entity.entity_id)
        .all()
    )

    history_items = []
    for pe, proj in project_entities:
        history_items.append({
            "project_id": proj.project_id,
            "district": proj.district,
            "sector": proj.sector,
            "sanctioned_amount": proj.financial.sanctioned_amount if proj.financial else 0.0,
            "sanction_date": proj.timeline.sanction_date.isoformat() if proj.timeline and proj.timeline.sanction_date else None,
            "duration_days": proj.timeline.duration_days if proj.timeline else None,
            "audit_priority_score": proj.risk_score.unified_score if proj.risk_score else 0.0,
            "priority_level": proj.risk_score.priority_level.value if proj.risk_score and hasattr(proj.risk_score.priority_level, "value") else "LOW",
        })

    return {
        "entity_id": entity.entity_id,
        "contractor_name": entity.name,
        "total_historical_projects": len(history_items),
        "history": history_items,
    }



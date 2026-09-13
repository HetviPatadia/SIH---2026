from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from typing import List, Optional, Dict, Any
from pathlib import Path
from backend.app.utils.geo import haversine_distance_meters

from backend.app.database.connection import get_db
from backend.app.database.models import (
    Project,
    ProjectEvidence,
    EvidenceFile,
    EvidenceMetadata,
    EvidenceHash,
    EvidenceSignal,
    EvidenceConfidence,
    AssetFingerprintRecord,
    ProjectEntity,
    Entity,
)
from backend.app.schemas.evidence import (
    EvidenceItemResponse,
    SimilarEvidenceMatchResponse,
    EvidenceSignalResponse,
    EvidenceConfidenceResponse,
    AssetFingerprintResponse,
    EvidenceTimelineItemResponse,
    EvidenceComparisonResponse,
    EvidenceSummaryResponse,
    EvidenceGapResponse,
    GlobalEvidenceItem,
    PaginatedGlobalEvidenceResponse,
)
from ai.evidence.engine import AssetEvidenceEngine
from ai.evidence.gap import EvidenceGapEngine
from ai.evidence.status import (
    determine_evidence_status,
    VALID_EVIDENCE_STATUSES,
    EVIDENCE_STATUS_POTENTIAL_REUSE,
    EVIDENCE_STATUS_LOCATION_INCONSISTENCY,
    EVIDENCE_STATUS_TEMPORAL_INCONSISTENCY,
    EVIDENCE_STATUS_INSUFFICIENT_METADATA,
    EVIDENCE_STATUS_REVIEW_REQUIRED,
    EVIDENCE_STATUS_VERIFIED,
    EVIDENCE_STATUS_UNAVAILABLE,
)

router = APIRouter(tags=["Asset Evidence Intelligence"])
evidence_engine = AssetEvidenceEngine()
evidence_gap_engine = EvidenceGapEngine()


# 1. Global Evidence Directory (Search, Filter, Paginate)
@router.get("/api/evidence", response_model=PaginatedGlobalEvidenceResponse)
def list_global_evidence(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    project_id: Optional[str] = None,
    evidence_type: Optional[str] = None,
    status: Optional[str] = None,
    confidence_level: Optional[str] = None,
    district: Optional[str] = None,
    has_similarity_signal: Optional[bool] = None,
    has_location_signal: Optional[bool] = None,
    has_temporal_signal: Optional[bool] = None,
    db: Session = Depends(get_db),
):
    query = (
        db.query(ProjectEvidence)
        .options(
            joinedload(ProjectEvidence.project),
            joinedload(ProjectEvidence.file),
            joinedload(ProjectEvidence.metadata_record),
            joinedload(ProjectEvidence.hashes),
        )
    )

    if project_id:
        query = query.filter(ProjectEvidence.project_id.ilike(f"%{project_id}%"))
    if evidence_type:
        query = query.filter(ProjectEvidence.evidence_type == evidence_type.upper())
    if district:
        query = query.join(Project, ProjectEvidence.project_id == Project.project_id).filter(Project.district.ilike(f"%{district}%"))
    if search:
        query = query.join(Project, ProjectEvidence.project_id == Project.project_id).filter(
            or_(
                ProjectEvidence.evidence_id.ilike(f"%{search}%"),
                ProjectEvidence.title.ilike(f"%{search}%"),
                ProjectEvidence.description.ilike(f"%{search}%"),
                ProjectEvidence.project_id.ilike(f"%{search}%"),
                Project.district.ilike(f"%{search}%"),
            )
        )

    all_matches = query.order_by(ProjectEvidence.created_at.desc()).all()

    # Pre-fetch signals and confidence for all matched project IDs
    matched_pids = list({e.project_id for e in all_matches})
    signals_by_pid = {}
    if matched_pids:
        all_signals = db.query(EvidenceSignal).filter(EvidenceSignal.project_id.in_(matched_pids)).all()
        for s in all_signals:
            signals_by_pid.setdefault(s.project_id, []).append(s)

    confidences_by_pid = {}
    if matched_pids:
        all_confs = db.query(EvidenceConfidence).filter(EvidenceConfidence.project_id.in_(matched_pids)).all()
        for c in all_confs:
            confidences_by_pid[c.project_id] = c

    filtered_items: List[GlobalEvidenceItem] = []
    for ev in all_matches:
        p_sigs = signals_by_pid.get(ev.project_id, [])
        ev_sigs = [s for s in p_sigs if s.evidence_id == ev.evidence_id or s.evidence_id is None]
        conf = confidences_by_pid.get(ev.project_id)

        meta = ev.metadata_record
        has_file = bool(ev.file and Path(ev.file.file_path).exists())
        has_meta = bool(meta and (meta.has_gps or meta.has_timestamp))
        meta_rel = meta.metadata_reliability if meta else 0.0
        has_gps = bool(meta and meta.has_gps)
        has_time = bool(meta and meta.has_timestamp)

        ev_status, sig_types = determine_evidence_status(
            signals=ev_sigs,
            has_file=has_file,
            has_metadata=has_meta,
            metadata_reliability=meta_rel,
            has_gps=has_gps,
            has_timestamp=has_time,
        )

        has_sim_sig = any(st in ("EXACT_EVIDENCE_REUSE", "POTENTIAL_EVIDENCE_REUSE") for st in sig_types)
        has_loc_sig = "EVIDENCE_LOCATION_INCONSISTENCY" in sig_types
        has_temp_sig = "TEMPORAL_EVIDENCE_INCONSISTENCY" in sig_types

        # Apply secondary filters
        if status and ev_status.upper() != status.upper():
            continue
        if confidence_level and (not conf or conf.confidence_level.upper() != confidence_level.upper()):
            continue
        if has_similarity_signal is not None and has_sim_sig != has_similarity_signal:
            continue
        if has_location_signal is not None and has_loc_sig != has_location_signal:
            continue
        if has_temporal_signal is not None and has_temp_sig != has_temporal_signal:
            continue

        loc_consistency = "INCONSISTENT" if has_loc_sig else ("CONSISTENT" if has_gps else "UNAVAILABLE")
        temp_consistency = "INCONSISTENT" if has_temp_sig else ("CONSISTENT" if has_time else "UNAVAILABLE")

        proj_title = ev.project.description.title if (ev.project and ev.project.description) else ev.project_id

        item = GlobalEvidenceItem(
            evidence_id=ev.evidence_id,
            project_id=ev.project_id,
            project_title=proj_title,
            district=ev.project.district if ev.project else None,
            state=ev.project.state if ev.project else None,
            evidence_type=ev.evidence_type,
            title=ev.title,
            source=ev.source,
            created_at=ev.created_at,
            status=ev_status,
            confidence=conf.overall_confidence if conf else None,
            confidence_level=conf.confidence_level if conf else None,
            similarity_signal=has_sim_sig,
            location_consistency=loc_consistency,
            temporal_consistency=temp_consistency,
            has_metadata=has_meta,
            signals_count=len(ev_sigs),
            signals=sig_types,
        )
        filtered_items.append(item)

    total = len(filtered_items)
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    paginated_items = filtered_items[start_idx:end_idx]

    return PaginatedGlobalEvidenceResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=paginated_items,
    )


# 2. Project Evidence List
@router.get("/api/projects/{project_id}/evidence", response_model=List[EvidenceItemResponse])
def get_project_evidence(project_id: str, db: Session = Depends(get_db)):
    evidences = (
        db.query(ProjectEvidence)
        .options(
            joinedload(ProjectEvidence.file),
            joinedload(ProjectEvidence.metadata_record),
            joinedload(ProjectEvidence.hashes),
        )
        .filter(ProjectEvidence.project_id == project_id)
        .all()
    )
    if not evidences:
        return []

    signals = db.query(EvidenceSignal).filter(EvidenceSignal.project_id == project_id).all()
    conf = db.query(EvidenceConfidence).filter(EvidenceConfidence.project_id == project_id).first()

    results = []
    for ev in evidences:
        ev_sigs = [s for s in signals if s.evidence_id == ev.evidence_id or s.evidence_id is None]
        meta = ev.metadata_record
        has_file = bool(ev.file and Path(ev.file.file_path).exists())
        has_meta = bool(meta and (meta.has_gps or meta.has_timestamp))
        meta_rel = meta.metadata_reliability if meta else 0.0
        has_gps = bool(meta and meta.has_gps)
        has_time = bool(meta and meta.has_timestamp)

        ev_status, sig_types = determine_evidence_status(
            signals=ev_sigs,
            has_file=has_file,
            has_metadata=has_meta,
            metadata_reliability=meta_rel,
            has_gps=has_gps,
            has_timestamp=has_time,
        )

        resp_item = EvidenceItemResponse.model_validate(ev)
        resp_item.status = ev_status
        resp_item.confidence = conf.overall_confidence if conf else None
        resp_item.confidence_level = conf.confidence_level if conf else None
        resp_item.signals = sig_types
        results.append(resp_item)

    return results


# 2. Project Cross-Search ("Find Similar Evidence")
@router.get("/api/projects/{project_id}/evidence/similar", response_model=List[SimilarEvidenceMatchResponse])
def find_similar_project_evidence(
    project_id: str,
    min_similarity: float = Query(0.75, ge=0.5, le=1.0),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    matches = evidence_engine.cross_search.find_similar_evidence(
        target_project_id=project_id, db=db, min_similarity=min_similarity, limit=limit
    )
    return matches


# 3. Evidence Gap Detection
@router.get("/api/projects/{project_id}/evidence-gap", response_model=EvidenceGapResponse)
def get_project_evidence_gap(project_id: str, db: Session = Depends(get_db)):
    result = evidence_gap_engine.evaluate_project_gap(project_id=project_id, db=db)
    if result["gap_status"] == "PROJECT_NOT_FOUND":
        raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found")
    return result


# 4. System Evidence Summary KPIs (must precede dynamic {evidence_id})
@router.get("/api/evidence/summary", response_model=EvidenceSummaryResponse)
def get_evidence_summary(db: Session = Depends(get_db)):
    total_ev = db.query(ProjectEvidence).count()
    projects_with_ev = db.query(ProjectEvidence.project_id).distinct().count()
    reuse_sigs = db.query(EvidenceSignal).filter(EvidenceSignal.signal_type.in_(["EXACT_EVIDENCE_REUSE", "POTENTIAL_EVIDENCE_REUSE"])).count()
    loc_sigs = db.query(EvidenceSignal).filter(EvidenceSignal.signal_type == "EVIDENCE_LOCATION_INCONSISTENCY").count()
    temp_sigs = db.query(EvidenceSignal).filter(EvidenceSignal.signal_type == "TEMPORAL_EVIDENCE_INCONSISTENCY").count()
    high_prio_cases = db.query(EvidenceSignal.project_id).filter(EvidenceSignal.severity.in_(["HIGH", "CRITICAL"])).distinct().count()

    return EvidenceSummaryResponse(
        total_evidence_items=total_ev,
        projects_with_evidence=projects_with_ev,
        potential_reuse_signals=reuse_sigs,
        location_inconsistency_signals=loc_sigs,
        temporal_inconsistency_signals=temp_sigs,
        high_priority_evidence_cases=high_prio_cases,
    )


# 3. High-Priority Evidence Cases (must precede dynamic {evidence_id})
@router.get("/api/evidence/cases/high-priority")
def get_high_priority_evidence_cases(db: Session = Depends(get_db)):
    signals = (
        db.query(EvidenceSignal)
        .options(joinedload(EvidenceSignal.project))
        .filter(EvidenceSignal.severity.in_(["HIGH", "CRITICAL"]))
        .order_by(EvidenceSignal.confidence.desc())
        .limit(50)
        .all()
    )
    results = []
    for s in signals:
        p = s.project
        proj_title = p.description.title if (p and p.description) else (p.project_id if p else s.project_id)
        results.append({
            "project_id": s.project_id,
            "project_title": proj_title,
            "district": p.district if p else None,
            "state": p.state if p else None,
            "evidence_id": s.evidence_id,
            "signal_type": s.signal_type,
            "severity": s.severity,
            "review_priority": "HIGH_PRIORITY_REVIEW",
            "audit_recommendation": "Potential Irregularity — Requires Human Verification",
            "confidence": s.confidence,
            "explanation": s.explanation,
            "details": s.evidence_details or {},
            "created_at": s.created_at.isoformat(),
        })
    return results


# 4. Single Evidence Detail
@router.get("/api/evidence/{evidence_id}", response_model=EvidenceItemResponse)
def get_evidence_detail(evidence_id: str, db: Session = Depends(get_db)):
    ev = (
        db.query(ProjectEvidence)
        .options(
            joinedload(ProjectEvidence.file),
            joinedload(ProjectEvidence.metadata_record),
            joinedload(ProjectEvidence.hashes),
        )
        .filter(ProjectEvidence.evidence_id == evidence_id)
        .first()
    )
    if not ev:
        raise HTTPException(status_code=404, detail=f"Evidence {evidence_id} not found")

    signals = (
        db.query(EvidenceSignal)
        .filter(
            (EvidenceSignal.evidence_id == evidence_id)
            | ((EvidenceSignal.evidence_id == None) & (EvidenceSignal.project_id == ev.project_id))
        )
        .all()
    )
    conf = db.query(EvidenceConfidence).filter(EvidenceConfidence.project_id == ev.project_id).first()

    meta = ev.metadata_record
    has_file = bool(ev.file and Path(ev.file.file_path).exists())
    has_meta = bool(meta and (meta.has_gps or meta.has_timestamp))
    meta_rel = meta.metadata_reliability if meta else 0.0
    has_gps = bool(meta and meta.has_gps)
    has_time = bool(meta and meta.has_timestamp)

    ev_status, sig_types = determine_evidence_status(
        signals=signals,
        has_file=has_file,
        has_metadata=has_meta,
        metadata_reliability=meta_rel,
        has_gps=has_gps,
        has_timestamp=has_time,
    )

    resp = EvidenceItemResponse.model_validate(ev)
    resp.status = ev_status
    resp.confidence = conf.overall_confidence if conf else None
    resp.confidence_level = conf.confidence_level if conf else None
    resp.signals = sig_types
    return resp


# 5. Serve Raw Evidence Image File
@router.get("/api/evidence/{evidence_id}/file")
def get_evidence_file(evidence_id: str, db: Session = Depends(get_db)):
    ev = db.query(ProjectEvidence).filter(ProjectEvidence.evidence_id == evidence_id).first()
    if not ev or not ev.file:
        raise HTTPException(status_code=404, detail=f"Evidence file for {evidence_id} not found")
    file_path = Path(ev.file.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Underlying file not found on disk")
    return FileResponse(path=str(file_path), media_type=ev.file.mime_type)


# 4. Metadata Inspector
@router.get("/api/evidence/{evidence_id}/metadata")
def get_evidence_metadata(evidence_id: str, db: Session = Depends(get_db)):
    meta = db.query(EvidenceMetadata).filter(EvidenceMetadata.evidence_id == evidence_id).first()
    if not meta:
        raise HTTPException(status_code=404, detail=f"Metadata for {evidence_id} not found")
    return {
        "evidence_id": evidence_id,
        "capture_time": meta.capture_time.isoformat() if meta.capture_time else None,
        "latitude": meta.latitude,
        "longitude": meta.longitude,
        "device_make": meta.device_make,
        "device_model": meta.device_model,
        "has_gps": meta.has_gps,
        "has_timestamp": meta.has_timestamp,
        "metadata_source": meta.metadata_source,
        "metadata_reliability": meta.metadata_reliability,
        "raw_exif": meta.raw_exif or {},
    }


# 5. Project Evidence Signals
@router.get("/api/projects/{project_id}/evidence-signals", response_model=List[EvidenceSignalResponse])
def get_project_evidence_signals(project_id: str, db: Session = Depends(get_db)):
    signals = db.query(EvidenceSignal).filter(EvidenceSignal.project_id == project_id).all()
    return signals


# 6. Evidence Graph Topology
@router.get("/api/projects/{project_id}/evidence-graph")
def get_project_evidence_graph(project_id: str, db: Session = Depends(get_db)):
    graph = evidence_engine.build_evidence_graph(project_id, db)
    return graph


# 7. Integrated Evidence Timeline
@router.get("/api/projects/{project_id}/evidence-timeline", response_model=List[EvidenceTimelineItemResponse])
def get_project_evidence_timeline(project_id: str, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.project_id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")

    items = []
    tim = proj.timeline
    if tim:
        if tim.sanction_date:
            items.append(EvidenceTimelineItemResponse(
                date=tim.sanction_date.strftime("%Y-%m-%d"),
                event_type="SANCTION",
                title="Project Sanctioned",
                details=f"Official sanction issued for {proj.project_id}.",
                is_evidence=False,
            ))
        if tim.start_date:
            items.append(EvidenceTimelineItemResponse(
                date=tim.start_date.strftime("%Y-%m-%d"),
                event_type="START",
                title="Work Commenced",
                details="Ground execution commenced by contractor.",
                is_evidence=False,
            ))
        if tim.completion_date:
            items.append(EvidenceTimelineItemResponse(
                date=tim.completion_date.strftime("%Y-%m-%d"),
                event_type="COMPLETION",
                title="Recorded Completion",
                details="Physical completion certificate filed.",
                is_evidence=False,
            ))

    evidences = db.query(ProjectEvidence).filter(ProjectEvidence.project_id == project_id).all()
    for ev in evidences:
        meta = ev.metadata_record
        cap_date = meta.capture_time.strftime("%Y-%m-%d") if (meta and meta.capture_time) else "Date Unavailable"
        items.append(EvidenceTimelineItemResponse(
            date=cap_date,
            event_type="PHOTO_EVIDENCE",
            title=f"Evidence: {ev.evidence_type.replace('_', ' ').title()}",
            details=f"Attached photo ({ev.title or ev.evidence_id}). GPS: {'Available' if (meta and meta.has_gps) else 'Unavailable'}.",
            is_evidence=True,
            evidence_id=ev.evidence_id,
        ))

    # Sort chronological
    items.sort(key=lambda x: x.date if x.date != "Date Unavailable" else "9999-99-99")
    return items


# 8. Upload and Analyze Evidence File
@router.post("/api/evidence/analyze")
async def upload_and_analyze_evidence(
    project_id: str = Form(...),
    evidence_type: str = Form("COMPLETION_PHOTO"),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    source: str = Form("eSAKSHI Upload"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    proj = db.query(Project).filter(Project.project_id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")

    content = await file.read()
    try:
        record = evidence_engine.ingest_and_analyze_file(
            project_id=project_id,
            file_bytes=content,
            file_name=file.filename,
            evidence_type=evidence_type,
            title=title or file.filename,
            description=description,
            source=source,
            db=db,
        )

        # Trigger project evaluation
        eval_result = evidence_engine.evaluate_project_evidence(project_id, db)

        return {
            "status": "SUCCESS",
            "evidence_id": record["evidence_id"],
            "sha256": record["file"]["sha256"],
            "metadata": record["metadata"],
            "hashes": record["hashes"],
            "project_evaluation": eval_result,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Evidence analysis failed: {e}")


# 9. Side-by-Side Evidence Comparator (Supports evidence IDs or project IDs)
@router.post("/api/evidence/compare", response_model=EvidenceComparisonResponse)
def compare_projects(payload: Dict[str, str], db: Session = Depends(get_db)):
    ev_id_a = payload.get("evidence_id_a")
    ev_id_b = payload.get("evidence_id_b")
    pid_a = payload.get("project_id_a")
    pid_b = payload.get("project_id_b")

    # Mode 1: Direct evidence ID comparison
    if ev_id_a and ev_id_b:
        ev_a = (
            db.query(ProjectEvidence)
            .options(
                joinedload(ProjectEvidence.file),
                joinedload(ProjectEvidence.metadata_record),
                joinedload(ProjectEvidence.hashes),
                joinedload(ProjectEvidence.embedding),
                joinedload(ProjectEvidence.project),
            )
            .filter(ProjectEvidence.evidence_id == ev_id_a)
            .first()
        )
        ev_b = (
            db.query(ProjectEvidence)
            .options(
                joinedload(ProjectEvidence.file),
                joinedload(ProjectEvidence.metadata_record),
                joinedload(ProjectEvidence.hashes),
                joinedload(ProjectEvidence.embedding),
                joinedload(ProjectEvidence.project),
            )
            .filter(ProjectEvidence.evidence_id == ev_id_b)
            .first()
        )

        if not ev_a or not ev_b:
            raise HTTPException(status_code=404, detail="One or both evidence items could not be found")

        p_a = ev_a.project
        p_b = ev_b.project

        # Compare hashes
        similarity_score = 0.0
        sim_method = "NONE"
        sha_match = False
        phash_sim = 0.0
        dhash_sim = 0.0
        ahash_sim = 0.0
        visual_emb_sim = 0.0

        if ev_a.hashes and ev_b.hashes:
            h_a = ev_a.hashes
            h_b = ev_b.hashes
            if h_a.sha256 and h_b.sha256 and h_a.sha256 == h_b.sha256:
                similarity_score = 1.0
                sim_method = "EXACT_SHA256"
                sha_match = True
                phash_sim = 1.0
                dhash_sim = 1.0
                ahash_sim = 1.0
            else:
                phash_sim = evidence_engine.hasher.calculate_similarity(h_a.phash, h_b.phash)
                dhash_sim = evidence_engine.hasher.calculate_similarity(h_a.dhash, h_b.dhash)
                ahash_sim = evidence_engine.hasher.calculate_similarity(h_a.ahash, h_b.ahash)
                hash_comp = (dhash_sim * 0.4) + (phash_sim * 0.4) + (ahash_sim * 0.2)

                if ev_a.embedding and ev_b.embedding and ev_a.embedding.embedding_vector and ev_b.embedding.embedding_vector:
                    visual_emb_sim = evidence_engine.embedder.cosine_similarity(
                        ev_a.embedding.embedding_vector, ev_b.embedding.embedding_vector
                    )
                    similarity_score = round(max(hash_comp, hash_comp * 0.6 + visual_emb_sim * 0.4), 4)
                    sim_method = "PERCEPTUAL_EMBEDDING"
                else:
                    similarity_score = round(hash_comp, 4)
                    sim_method = "PERCEPTUAL_HASH"

        # Compare GPS
        meta_a = ev_a.metadata_record
        meta_b = ev_b.metadata_record
        gps_distance_meters = None
        if (
            meta_a
            and meta_b
            and meta_a.latitude is not None
            and meta_a.longitude is not None
            and meta_b.latitude is not None
            and meta_b.longitude is not None
        ):
            gps_distance_meters = round(
                haversine_distance_meters(meta_a.latitude, meta_a.longitude, meta_b.latitude, meta_b.longitude), 1
            )

        # Compare timestamps
        time_discrepancy_days = None
        if meta_a and meta_b and meta_a.capture_time and meta_b.capture_time:
            dt_a = meta_a.capture_time.replace(tzinfo=None)
            dt_b = meta_b.capture_time.replace(tzinfo=None)
            time_discrepancy_days = abs((dt_a - dt_b).days)

        # Compare contractors
        c_a = db.query(Entity).join(ProjectEntity, ProjectEntity.entity_id == Entity.entity_id).filter(ProjectEntity.project_id == ev_a.project_id).first()
        c_b = db.query(Entity).join(ProjectEntity, ProjectEntity.entity_id == Entity.entity_id).filter(ProjectEntity.project_id == ev_b.project_id).first()
        same_contractor = bool(c_a and c_b and c_a.name == c_b.name)
        same_district = bool(p_a and p_b and p_a.district == p_b.district)

        evidence_a_data = {
            "evidence_id": ev_a.evidence_id,
            "project_id": ev_a.project_id,
            "project_title": p_a.description.title if (p_a and p_a.description) else ev_a.project_id,
            "district": p_a.district if p_a else None,
            "contractor": c_a.name if c_a else "Not Assigned",
            "evidence_type": ev_a.evidence_type,
            "title": ev_a.title,
            "sha256": ev_a.hashes.sha256 if ev_a.hashes else None,
            "capture_time": meta_a.capture_time.isoformat() if (meta_a and meta_a.capture_time) else None,
            "latitude": meta_a.latitude if meta_a else None,
            "longitude": meta_a.longitude if meta_a else None,
        }

        evidence_b_data = {
            "evidence_id": ev_b.evidence_id,
            "project_id": ev_b.project_id,
            "project_title": p_b.description.title if (p_b and p_b.description) else ev_b.project_id,
            "district": p_b.district if p_b else None,
            "contractor": c_b.name if c_b else "Not Assigned",
            "evidence_type": ev_b.evidence_type,
            "title": ev_b.title,
            "sha256": ev_b.hashes.sha256 if ev_b.hashes else None,
            "capture_time": meta_b.capture_time.isoformat() if (meta_b and meta_b.capture_time) else None,
            "latitude": meta_b.latitude if meta_b else None,
            "longitude": meta_b.longitude if meta_b else None,
        }

        match_tier = evidence_engine.hasher.classify_similarity_tier(similarity_score)
        if sha_match:
            finding = "Exact cryptographic file reuse detected (SHA-256 match). Human verification recommended."
        elif similarity_score >= 0.88:
            finding = "High visual similarity detected between evidence photographs. Human verification recommended."
        elif similarity_score >= 0.75:
            finding = "Moderate visual similarity detected between evidence items."
        else:
            finding = "Evidence items appear distinct based on multi-hash and visual feature comparison."

        return EvidenceComparisonResponse(
            comparison_type="EVIDENCE",
            evidence_a=evidence_a_data,
            evidence_b=evidence_b_data,
            similarity_analysis={
                "similarity_score": similarity_score,
                "similarity_percentage": round(similarity_score * 100.0, 1),
                "similarity_method": sim_method,
                "match_tier": match_tier,
                "sha256_match": sha_match,
                "phash_similarity": phash_sim,
                "dhash_similarity": dhash_sim,
                "ahash_similarity": ahash_sim,
                "visual_embedding_similarity": visual_emb_sim,
                "same_contractor": same_contractor,
                "same_district": same_district,
                "gps_distance_meters": gps_distance_meters,
                "time_discrepancy_days": time_discrepancy_days,
            },
            consistency_summary={
                "is_suspect_reuse": similarity_score >= 0.88 or sha_match,
                "exact_file_reuse": sha_match,
                "potential_visual_reuse": (similarity_score >= 0.88 and not sha_match),
                "finding": finding,
            },
        )

    # Mode 2: Project-level comparison (fallback for backward compatibility)
    if not pid_a or not pid_b:
        raise HTTPException(status_code=400, detail="Provide either (evidence_id_a, evidence_id_b) or (project_id_a, project_id_b)")

    p_a = db.query(Project).filter(Project.project_id == pid_a).first()
    p_b = db.query(Project).filter(Project.project_id == pid_b).first()

    if not p_a or not p_b:
        raise HTTPException(status_code=404, detail="One or both projects could not be found")

    # Fetch contractors
    c_a = db.query(Entity).join(ProjectEntity, ProjectEntity.entity_id == Entity.entity_id).filter(ProjectEntity.project_id == pid_a).first()
    c_b = db.query(Entity).join(ProjectEntity, ProjectEntity.entity_id == Entity.entity_id).filter(ProjectEntity.project_id == pid_b).first()

    # Fetch primary evidence
    ev_a = db.query(ProjectEvidence).filter(ProjectEvidence.project_id == pid_a).first()
    ev_b = db.query(ProjectEvidence).filter(ProjectEvidence.project_id == pid_b).first()

    # Calculate similarity between primary evidence
    similarity_score = 0.0
    sim_method = "NONE"
    sha_match = False
    if ev_a and ev_b and ev_a.hashes and ev_b.hashes:
        if ev_a.hashes.sha256 == ev_b.hashes.sha256:
            similarity_score = 1.0
            sim_method = "EXACT_SHA256"
            sha_match = True
        else:
            sim_p = evidence_engine.hasher.calculate_similarity(ev_a.hashes.phash, ev_b.hashes.phash)
            sim_d = evidence_engine.hasher.calculate_similarity(ev_a.hashes.dhash, ev_b.hashes.dhash)
            similarity_score = round((sim_p * 0.6) + (sim_d * 0.4), 4)
            sim_method = "PERCEPTUAL_HASH"

    project_a_data = {
        "project_id": p_a.project_id,
        "title": p_a.description.title if p_a.description else p_a.project_id,
        "district": p_a.district,
        "state": p_a.state,
        "sanctioned_amount": p_a.financial.sanctioned_amount if p_a.financial else 0.0,
        "expenditure": p_a.financial.expenditure if p_a.financial else 0.0,
        "contractor": c_a.name if c_a else "Not Assigned",
        "latitude": p_a.location.latitude if p_a.location else None,
        "longitude": p_a.location.longitude if p_a.location else None,
        "primary_evidence_id": ev_a.evidence_id if ev_a else None,
        "primary_evidence_title": ev_a.title if ev_a else None,
    }

    project_b_data = {
        "project_id": p_b.project_id,
        "title": p_b.description.title if p_b.description else p_b.project_id,
        "district": p_b.district,
        "state": p_b.state,
        "sanctioned_amount": p_b.financial.sanctioned_amount if p_b.financial else 0.0,
        "expenditure": p_b.financial.expenditure if p_b.financial else 0.0,
        "contractor": c_b.name if c_b else "Not Assigned",
        "latitude": p_b.location.latitude if p_b.location else None,
        "longitude": p_b.location.longitude if p_b.location else None,
        "primary_evidence_id": ev_b.evidence_id if ev_b else None,
        "primary_evidence_title": ev_b.title if ev_b else None,
    }

    if sha_match:
        finding = "Exact cryptographic file reuse detected (SHA-256 match). Human verification recommended."
    elif similarity_score >= 0.88:
        finding = "High visual evidence reuse detected across projects. Human verification recommended."
    else:
        finding = "No high-confidence evidence reuse detected between these two records."

    return EvidenceComparisonResponse(
        comparison_type="PROJECT",
        project_a=project_a_data,
        project_b=project_b_data,
        similarity_analysis={
            "similarity_score": similarity_score,
            "similarity_percentage": round(similarity_score * 100.0, 1),
            "similarity_method": sim_method,
            "match_tier": evidence_engine.hasher.classify_similarity_tier(similarity_score),
            "sha256_match": sha_match,
            "same_contractor": bool(c_a and c_b and c_a.name == c_b.name),
            "same_district": p_a.district == p_b.district,
        },
        consistency_summary={
            "is_suspect_reuse": similarity_score >= 0.88 or sha_match,
            "exact_file_reuse": sha_match,
            "potential_visual_reuse": (similarity_score >= 0.88 and not sha_match),
            "finding": finding,
        },
    )

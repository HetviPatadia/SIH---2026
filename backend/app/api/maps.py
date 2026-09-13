from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List, Dict, Any
import numpy as np
from sklearn.cluster import DBSCAN

from backend.app.database.connection import get_db
from backend.app.database.models import (
    Project,
    ProjectLocation,
    ProjectFinancial,
    RiskScore,
    ProjectDescription,
    RiskPriorityEnum,
    AnomalySignal,
    ProjectEvidence,
    EvidenceMetadata,
    EvidenceSignal,
)
from backend.app.schemas.map import (
    MapMarker,
    MapResponse,
    ClusterSummary,
    MapSummaryResponse,
    LocationConsistencyResponse,
)
from backend.app.utils.geo import is_valid_coordinate, haversine_distance_meters

router = APIRouter(prefix="/api/maps", tags=["GIS Map & Spatial API"])

@router.get("/summary", response_model=MapSummaryResponse)
def get_map_summary(db: Session = Depends(get_db)):
    total_projects = db.query(Project).count()

    projects_with_coords = (
        db.query(Project)
        .join(ProjectLocation, Project.project_id == ProjectLocation.project_id)
        .filter(
            ProjectLocation.has_valid_coords == True,
            ProjectLocation.latitude != None,
            ProjectLocation.longitude != None,
            ProjectLocation.latitude >= -90.0,
            ProjectLocation.latitude <= 90.0,
            ProjectLocation.longitude >= -180.0,
            ProjectLocation.longitude <= 180.0,
        )
        .count()
    )
    projects_without_coords = total_projects - projects_with_coords

    high_priority = (
        db.query(RiskScore)
        .filter(RiskScore.priority_level == RiskPriorityEnum.HIGH)
        .count()
    )
    critical_priority = (
        db.query(RiskScore)
        .filter(RiskScore.priority_level == RiskPriorityEnum.CRITICAL)
        .count()
    )

    # Spatial signal count from anomaly signals and evidence signals
    spatial_anomaly_count = (
        db.query(AnomalySignal)
        .filter(AnomalySignal.signal_type.in_(["PHYSICAL_PROXIMITY_OVERLAP", "POTENTIAL_GEO_DUPLICATE", "HIGH_SPATIAL_PROXIMITY"]))
        .count()
    )
    location_inconsistency_count = (
        db.query(EvidenceSignal)
        .filter(EvidenceSignal.signal_type == "EVIDENCE_LOCATION_INCONSISTENCY")
        .count()
    )

    # Calculate cluster count with default 1.0 km radius
    clusters = get_map_clusters(radius_km=1.0, min_projects=3, district=None, priority=None, db=db)

    return MapSummaryResponse(
        total_projects=total_projects,
        projects_with_coordinates=projects_with_coords,
        projects_without_coordinates=projects_without_coords,
        high_priority_projects=high_priority,
        critical_priority_projects=critical_priority,
        cluster_count=len(clusters),
        spatial_signal_count=spatial_anomaly_count + location_inconsistency_count,
    )

@router.get("/projects", response_model=MapResponse)
def get_map_markers(
    district: Optional[str] = Query(None, description="Filter by district"),
    priority: Optional[str] = Query(None, description="Filter by priority: LOW, MEDIUM, HIGH, CRITICAL, or HIGH,CRITICAL"),
    sector: Optional[str] = Query(None, description="Filter by sector"),
    state: Optional[str] = Query(None, description="Filter by state"),
    limit: int = Query(2500, ge=1, le=5000, description="Maximum markers to return"),
    db: Session = Depends(get_db),
):
    query = (
        db.query(
            Project.project_id,
            Project.district,
            Project.state,
            Project.sector,
            ProjectLocation.latitude,
            ProjectLocation.longitude,
            ProjectFinancial.sanctioned_amount,
            RiskScore.unified_score,
            RiskScore.priority_level,
            ProjectDescription.title,
        )
        .join(ProjectLocation, Project.project_id == ProjectLocation.project_id)
        .outerjoin(ProjectFinancial, Project.project_id == ProjectFinancial.project_id)
        .outerjoin(RiskScore, Project.project_id == RiskScore.project_id)
        .outerjoin(ProjectDescription, Project.project_id == ProjectDescription.project_id)
        .filter(
            ProjectLocation.has_valid_coords == True,
            ProjectLocation.latitude != None,
            ProjectLocation.longitude != None,
            ProjectLocation.latitude >= -90.0,
            ProjectLocation.latitude <= 90.0,
            ProjectLocation.longitude >= -180.0,
            ProjectLocation.longitude <= 180.0,
        )
    )

    if district and district.strip():
        query = query.filter(Project.district.ilike(f"%{district.strip()}%"))

    if sector and sector.strip():
        query = query.filter(Project.sector.ilike(f"%{sector.strip()}%"))

    if state and state.strip():
        query = query.filter(Project.state.ilike(f"%{state.strip()}%"))

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

    records = (
        query.order_by(RiskScore.unified_score.desc().nullslast(), Project.project_id)
        .limit(limit)
        .all()
    )

    markers = []
    for r in records:
        if not is_valid_coordinate(r.latitude, r.longitude):
            continue

        level_str = (
            r.priority_level.value
            if (r.priority_level and hasattr(r.priority_level, "value"))
            else (str(r.priority_level) if r.priority_level else "LOW")
        )
        markers.append(MapMarker(
            project_id=r.project_id,
            title=r.title or r.project_id,
            latitude=r.latitude,
            longitude=r.longitude,
            priority_level=level_str,
            unified_score=r.unified_score or 0.0,
            sanctioned_amount=r.sanctioned_amount or 0.0,
            district=r.district or "",
            sector=r.sector or "",
            state=r.state,
        ))

    return MapResponse(total_markers=len(markers), markers=markers)

@router.get("/clusters", response_model=List[ClusterSummary])
def get_map_clusters(
    radius_km: float = Query(1.0, ge=0.1, le=25.0, description="Spatial proximity threshold in kilometers (default: 1.0 km)"),
    min_projects: int = Query(3, ge=2, le=50, description="Minimum projects within radius to constitute a geographic cluster (default: 3)"),
    district: Optional[str] = Query(None, description="Optional district filter"),
    priority: Optional[str] = Query(None, description="Optional priority filter"),
    db: Session = Depends(get_db),
):
    query = (
        db.query(
            Project.project_id,
            Project.district,
            ProjectLocation.latitude,
            ProjectLocation.longitude,
            RiskScore.unified_score,
            RiskScore.priority_level,
        )
        .join(ProjectLocation, Project.project_id == ProjectLocation.project_id)
        .outerjoin(RiskScore, Project.project_id == RiskScore.project_id)
        .filter(
            ProjectLocation.has_valid_coords == True,
            ProjectLocation.latitude != None,
            ProjectLocation.longitude != None,
            ProjectLocation.latitude >= -90.0,
            ProjectLocation.latitude <= 90.0,
            ProjectLocation.longitude >= -180.0,
            ProjectLocation.longitude <= 180.0,
        )
    )

    if district and district.strip():
        query = query.filter(Project.district.ilike(f"%{district.strip()}%"))

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

    records = query.all()
    if len(records) < min_projects:
        return []

    coords = np.array([[r.latitude, r.longitude] for r in records])
    coords_rad = np.radians(coords)

    # Earth radius in kilometers
    earth_radius_km = 6371.0
    eps_rad = radius_km / earth_radius_km

    # Haversine metric DBSCAN on spherical coordinates
    dbscan = DBSCAN(eps=eps_rad, min_samples=min_projects, metric="haversine")
    labels = dbscan.fit_predict(coords_rad)

    cluster_groups: Dict[int, List[int]] = {}
    for idx, label in enumerate(labels):
        if label != -1:
            cluster_groups.setdefault(label, []).append(idx)

    clusters: List[ClusterSummary] = []
    sorted_cluster_labels = sorted(
        cluster_groups.keys(),
        key=lambda l: len(cluster_groups[l]),
        reverse=True,
    )

    for cluster_num, label in enumerate(sorted_cluster_labels, start=1):
        indices = cluster_groups[label]
        clust_records = [records[i] for i in indices]

        pids = [r.project_id for r in clust_records]
        lats = [r.latitude for r in clust_records]
        lons = [r.longitude for r in clust_records]
        scores = [r.unified_score or 0.0 for r in clust_records]

        # Dominant district
        dist_counts: Dict[str, int] = {}
        for r in clust_records:
            d = r.district or "Unknown"
            dist_counts[d] = dist_counts.get(d, 0) + 1
        dominant_dist = max(dist_counts.items(), key=lambda x: x[1])[0]

        # Risk breakdown
        high_cnt = sum(
            1 for r in clust_records
            if r.priority_level and (
                r.priority_level.value in ["HIGH", "CRITICAL"]
                if hasattr(r.priority_level, "value")
                else str(r.priority_level) in ["HIGH", "CRITICAL"]
            )
        )
        crit_cnt = sum(
            1 for r in clust_records
            if r.priority_level and (
                r.priority_level.value == "CRITICAL"
                if hasattr(r.priority_level, "value")
                else str(r.priority_level) == "CRITICAL"
            )
        )

        clusters.append(ClusterSummary(
            cluster_id=f"cluster_{cluster_num}",
            district=dominant_dist,
            center_lat=round(float(np.mean(lats)), 5),
            center_lon=round(float(np.mean(lons)), 5),
            project_count=len(clust_records),
            avg_risk_score=round(float(np.mean(scores)), 1),
            anomaly_flag_count=high_cnt,
            radius_km=round(radius_km, 2),
            high_priority_count=high_cnt,
            critical_priority_count=crit_cnt,
            projects=pids,
        ))

    return clusters

@router.get("/projects/{project_id}/location-consistency", response_model=LocationConsistencyResponse)
def get_project_location_consistency(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.project_id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found")

    has_proj_coords = bool(
        project.location
        and project.location.has_valid_coords
        and is_valid_coordinate(project.location.latitude, project.location.longitude)
    )

    proj_lat = project.location.latitude if has_proj_coords else None
    proj_lon = project.location.longitude if has_proj_coords else None

    # Fetch associated evidences
    evidences = (
        db.query(ProjectEvidence)
        .filter(ProjectEvidence.project_id == project_id)
        .all()
    )

    ev_records = []
    has_any_gps = False
    any_inconsistent = False

    for ev in evidences:
        meta = ev.metadata_record
        has_ev_gps = bool(meta and meta.has_gps and is_valid_coordinate(meta.latitude, meta.longitude))
        if has_ev_gps:
            has_any_gps = True

        dist_m = None
        status = "UNAVAILABLE"
        if has_proj_coords and has_ev_gps:
            dist_m = round(haversine_distance_meters(proj_lat, proj_lon, meta.latitude, meta.longitude), 1)
            # Tolerance standard: 500 meters
            if dist_m <= 500.0:
                status = "CONSISTENT"
            else:
                status = "INCONSISTENT"
                any_inconsistent = True

        ev_records.append({
            "evidence_id": ev.evidence_id,
            "title": ev.title,
            "evidence_type": ev.evidence_type,
            "has_gps": has_ev_gps,
            "evidence_location": {
                "latitude": meta.latitude if has_ev_gps else None,
                "longitude": meta.longitude if has_ev_gps else None,
            } if meta else None,
            "distance_meters": dist_m,
            "consistency": status,
        })

    if not has_proj_coords or not has_any_gps:
        overall = "UNAVAILABLE"
    elif any_inconsistent:
        overall = "INCONSISTENT"
    else:
        overall = "CONSISTENT"

    return LocationConsistencyResponse(
        project_id=project_id,
        has_project_coords=has_proj_coords,
        project_location={
            "latitude": proj_lat,
            "longitude": proj_lon,
        } if has_proj_coords else None,
        evidence_count=len(evidences),
        evidence_records=ev_records,
        overall_consistency=overall,
    )


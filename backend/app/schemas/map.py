from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class MapMarker(BaseModel):
    project_id: str
    title: str
    latitude: float
    longitude: float
    priority_level: str
    unified_score: float
    sanctioned_amount: float
    district: str
    sector: str
    state: Optional[str] = None
    spatial_anomaly_signal: Optional[str] = None

class ClusterSummary(BaseModel):
    cluster_id: str
    center_lat: float
    center_lon: float
    project_count: int
    avg_risk_score: float
    district: str
    anomaly_flag_count: int
    radius_km: Optional[float] = None
    high_priority_count: Optional[int] = 0
    critical_priority_count: Optional[int] = 0
    projects: Optional[List[str]] = []

class MapResponse(BaseModel):
    total_markers: int
    markers: List[MapMarker]
    clusters: Optional[List[ClusterSummary]] = None

class MapSummaryResponse(BaseModel):
    total_projects: int
    projects_with_coordinates: int
    projects_without_coordinates: int
    high_priority_projects: int
    critical_priority_projects: int
    cluster_count: int
    spatial_signal_count: int

class NearbyProjectItem(BaseModel):
    project_id: str
    title: str
    distance_km: float
    distance_meters: float
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    district: Optional[str] = None
    sector: Optional[str] = None
    priority_level: Optional[str] = None
    audit_priority: Optional[float] = None
    sanctioned_amount: Optional[float] = None

class NearbyProjectsResponse(BaseModel):
    project_id: str
    nearby: List[NearbyProjectItem]

class LocationConsistencyResponse(BaseModel):
    project_id: str
    has_project_coords: bool
    project_location: Optional[Dict[str, Optional[float]]] = None
    evidence_count: int
    evidence_records: List[Dict[str, Any]] = []
    overall_consistency: str  # CONSISTENT, INCONSISTENT, UNAVAILABLE

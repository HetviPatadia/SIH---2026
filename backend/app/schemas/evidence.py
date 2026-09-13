from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime


class EvidenceFileSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    file_name: str
    mime_type: str
    file_size: int
    sha256: str
    width: Optional[int] = None
    height: Optional[int] = None


class EvidenceMetadataSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    capture_time: Optional[datetime] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    device_make: Optional[str] = None
    device_model: Optional[str] = None
    has_gps: bool = False
    has_timestamp: bool = False
    metadata_reliability: float = 0.0


class EvidenceHashesSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    sha256: Optional[str] = None
    phash: Optional[str] = None
    dhash: Optional[str] = None
    ahash: Optional[str] = None


class EvidenceItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    evidence_id: str
    project_id: str
    evidence_type: str
    title: Optional[str] = None
    description: Optional[str] = None
    source: Optional[str] = None
    created_at: datetime
    status: Optional[str] = "ACTIVE"
    confidence: Optional[float] = None
    confidence_level: Optional[str] = None
    signals: Optional[List[str]] = None
    file: Optional[EvidenceFileSchema] = None
    metadata_record: Optional[EvidenceMetadataSchema] = None
    hashes: Optional[EvidenceHashesSchema] = None


class SimilarEvidenceMatchResponse(BaseModel):
    target_evidence_id: str
    matched_evidence_id: str
    matched_project_id: str
    matched_project_title: str
    matched_district: str
    matched_contractor: Optional[str] = None
    is_same_contractor: bool = False
    similarity_score: float
    similarity_percentage: float
    similarity_method: str
    match_tier: str
    distance_meters: Optional[float] = None
    evidence_type: str


class EvidenceSignalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: str
    evidence_id: Optional[str] = None
    signal_type: str
    severity: str
    confidence: float
    explanation: str
    created_at: datetime
    evidence_details: Optional[Dict[str, Any]] = None


class EvidenceConfidenceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    project_id: str
    overall_confidence: float
    completeness_score: float
    metadata_reliability: float
    data_freshness: float
    confidence_level: str
    reasons: Optional[List[str]] = None
    calculated_at: datetime


class AssetFingerprintResponse(BaseModel):
    project_id: str
    fingerprint_hash: str
    fingerprint_data: Dict[str, Any]
    generated_at: datetime


class EvidenceTimelineItemResponse(BaseModel):
    date: Optional[str] = None
    event_type: str  # "SANCTION", "START", "COMPLETION", "PHOTO_EVIDENCE"
    title: str
    details: str
    is_evidence: bool = False
    evidence_id: Optional[str] = None


class EvidenceComparisonResponse(BaseModel):
    project_a: Optional[Dict[str, Any]] = None
    project_b: Optional[Dict[str, Any]] = None
    evidence_a: Optional[Dict[str, Any]] = None
    evidence_b: Optional[Dict[str, Any]] = None
    similarity_analysis: Dict[str, Any]
    consistency_summary: Dict[str, Any]
    comparison_type: str = "PROJECT"  # "PROJECT" or "EVIDENCE"


class EvidenceSummaryResponse(BaseModel):
    total_evidence_items: int
    projects_with_evidence: int
    potential_reuse_signals: int
    location_inconsistency_signals: int
    temporal_inconsistency_signals: int
    high_priority_evidence_cases: int

class EvidenceGapResponse(BaseModel):
    project_id: str
    coverage_percentage: float
    gap_status: str
    missing_items: List[str]
    present_items: List[str]
    recommendation: str


class GlobalEvidenceItem(BaseModel):
    evidence_id: str
    project_id: str
    project_title: str
    district: Optional[str] = None
    state: Optional[str] = None
    evidence_type: str
    title: Optional[str] = None
    source: Optional[str] = None
    created_at: datetime
    status: str
    confidence: Optional[float] = None
    confidence_level: Optional[str] = None
    similarity_signal: bool = False
    location_consistency: str = "UNAVAILABLE"
    temporal_consistency: str = "UNAVAILABLE"
    has_metadata: bool = False
    signals_count: int = 0
    signals: List[str] = []


class PaginatedGlobalEvidenceResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[GlobalEvidenceItem]


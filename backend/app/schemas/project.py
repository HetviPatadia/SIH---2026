from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class LocationSchema(BaseModel):
    block: Optional[str] = None
    village: Optional[str] = None
    location_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    has_valid_coords: bool = False

    class Config:
        from_attributes = True

class FinancialSchema(BaseModel):
    sanctioned_amount: float = 0.0
    estimated_cost: float = 0.0
    expenditure: float = 0.0
    utilization_ratio: float = 0.0

    class Config:
        from_attributes = True

class TimelineSchema(BaseModel):
    recommendation_date: Optional[datetime] = None
    sanction_date: Optional[datetime] = None
    start_date: Optional[datetime] = None
    completion_date: Optional[datetime] = None
    duration_days: Optional[int] = None
    delay_days: int = 0

    class Config:
        from_attributes = True

class EntityLinkSchema(BaseModel):
    entity_id: str
    name: str
    entity_type: str
    relationship_role: str

class RiskSummarySchema(BaseModel):
    unified_score: float
    priority_level: str
    explanation_summary: Optional[str] = None
    calculated_at: Optional[datetime] = None
    top_reasons: Optional[List[Dict[str, Any]]] = None
    domains_available: Optional[Dict[str, bool]] = None
    evidence_confidence: Optional[float] = None

class ProjectResponse(BaseModel):
    project_id: str
    dataset_version: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    constituency: Optional[str] = None
    mp_name: Optional[str] = None
    sector: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None
    location: Optional[LocationSchema] = None
    financial: Optional[FinancialSchema] = None
    timeline: Optional[TimelineSchema] = None
    risk_score: Optional[RiskSummarySchema] = None

    # Reviews and Investigation integration fields
    audit_priority: Optional[float] = None
    priority_level: Optional[str] = None
    why_flagged: Optional[str] = None
    evidence_status: Optional[str] = "UNAVAILABLE"
    review_status: Optional[str] = "NEW"
    assigned_to: Optional[str] = None
    case_id: Optional[str] = None
    updated_at: Optional[datetime] = None
    primary_signals: List[str] = []

    class Config:
        from_attributes = True

class PaginatedProjectResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[ProjectResponse]


class PublicProjectResponse(BaseModel):
    project_id: str
    dataset_version: Optional[str] = "DEMO-SYNTHETIC-v1"
    state: Optional[str] = None
    district: Optional[str] = None
    constituency: Optional[str] = None
    mp_name: Optional[str] = None
    sector: Optional[str] = None
    status: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[LocationSchema] = None
    financial: Optional[FinancialSchema] = None
    timeline: Optional[TimelineSchema] = None
    contractor_name: Optional[str] = None
    public_rating: float = 4.2
    public_rating_count: int = 24

    class Config:
        from_attributes = True


class PaginatedPublicProjectResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[PublicProjectResponse]

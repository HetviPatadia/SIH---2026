from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class GraphNode(BaseModel):
    id: str
    label: str
    type: str  # CONTRACTOR, PROJECT, DISTRICT, AGENCY
    risk_level: Optional[str] = "LOW"
    score: Optional[float] = 0.0
    metadata: Optional[Dict[str, Any]] = None

class GraphEdge(BaseModel):
    source: str
    target: str
    relation: str  # AWARDED_TO, LOCATED_IN, ASSOCIATED_WITH, POTENTIAL_EVIDENCE_REUSE, REPEATED_ASSOCIATION
    weight: Optional[float] = 1.0
    explanation: Optional[str] = None
    relationship_count: Optional[int] = 1

class NetworkGraphResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    status: str = "SUCCESS"  # or "UNAVAILABLE"
    reason: Optional[str] = None
    metrics: Optional[Dict[str, Any]] = None

class ContractorSummary(BaseModel):
    total_projects: int = 0
    district_count: int = 0
    high_priority_projects: int = 0
    average_audit_priority: float = 0.0
    total_sanctioned_amount: float = 0.0

class ContractorInvestigationResponse(BaseModel):
    contractor: str
    entity_id: str
    summary: ContractorSummary
    projects: List[Dict[str, Any]] = []
    nodes: List[GraphNode] = []
    edges: List[GraphEdge] = []
    status: str = "SUCCESS"
    reason: Optional[str] = None
    metrics: Optional[Dict[str, Any]] = None

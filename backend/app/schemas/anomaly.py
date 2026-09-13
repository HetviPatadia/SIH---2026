from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class FeatureContribution(BaseModel):
    feature: str
    value: Any
    contribution: float
    direction: str  # INCREASES_PRIORITY, POSITIVE, NEUTRAL
    importance: float
    domain: Optional[str] = None

class EvidenceItem(BaseModel):
    signal: str
    finding: str
    evidence_data: Dict[str, Any]

class AnomalySignalDetail(BaseModel):
    engine_name: str
    signal_type: str
    severity: str
    score: float
    reason: str
    evidence: Optional[Dict[str, Any]] = None

class TopReasonItem(BaseModel):
    domain: str
    reason: str
    contribution: float

class RiskExplanationResponse(BaseModel):
    project_id: str
    unified_score: float  # 0 to 100
    priority_level: str   # LOW, MEDIUM, HIGH, CRITICAL
    financial_contribution: float
    temporal_contribution: float
    text_contribution: float
    spatial_contribution: float
    network_contribution: float
    split_tender_contribution: Optional[float] = 0.0
    evidence_contribution: Optional[float] = 0.0
    explanation_summary: str
    why_flagged: List[str] = []
    signals: List[AnomalySignalDetail] = []
    feature_contributions: List[FeatureContribution] = []
    evidence: List[EvidenceItem] = []
    top_reasons: List[TopReasonItem] = []
    domains_available: Optional[Dict[str, bool]] = None
    domain_signals: Optional[Dict[str, Any]] = None
    evidence_confidence: Optional[float] = None
    dataset_version: Optional[str] = None
    model_version: Optional[str] = None
    audit_disclaimer: str = (
        "This score prioritizes projects for human review and does not establish "
        "fraud, misconduct, or legal liability. Requires human verification."
    )

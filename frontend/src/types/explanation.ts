export interface TopReasonItem {
  domain: string;
  reason: string;
  contribution: number;
}

export interface FeatureContribution {
  feature: string;
  value: string;
  contribution: number;
  direction: string;
  importance: number;
  domain?: string | null;
}

export interface EvidenceBreakdownItem {
  signal: string;
  finding: string;
  evidence_data: Record<string, unknown>;
}

export interface AnomalySignalDetail {
  engine_name: string;
  signal_type: string;
  severity: string;
  score: number;
  reason: string;
  evidence?: Record<string, unknown>;
}

export interface DomainSignalDetail {
  available: boolean;
  score: number | null;
  signal: string;
  signals: string[];
  reason: string;
  contribution: number;
  details: Record<string, unknown>;
}

export interface RiskExplanationResponse {
  project_id: string;
  unified_score: number;
  priority_level: string;
  financial_contribution: number;
  temporal_contribution: number;
  text_contribution: number;
  spatial_contribution: number;
  network_contribution: number;
  split_tender_contribution: number;
  evidence_contribution: number;
  explanation_summary: string;
  why_flagged: string[];
  signals: AnomalySignalDetail[];
  feature_contributions: FeatureContribution[];
  evidence: EvidenceBreakdownItem[];
  top_reasons: TopReasonItem[];
  domains_available: Record<string, boolean>;
  domain_signals?: Record<string, DomainSignalDetail>;
  evidence_confidence: number | null;
  dataset_version: string;
  model_version: string;
  audit_disclaimer: string;
}

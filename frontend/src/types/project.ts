export type AuditPriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ProjectLocation {
  block?: string;
  village?: string;
  location_name?: string;
  latitude?: number | null;
  longitude?: number | null;
  has_valid_coords?: boolean;
}

export interface ProjectFinancial {
  sanctioned_amount: number;
  estimated_cost: number;
  expenditure: number;
  utilization_ratio: number;
}

export interface ProjectTimeline {
  recommendation_date?: string | null;
  sanction_date?: string | null;
  start_date?: string | null;
  completion_date?: string | null;
  duration_days?: number | null;
  delay_days?: number;
}

export interface ProjectRiskScore {
  unified_score: number;
  priority_level: AuditPriorityLevel;
  explanation_summary?: string;
  calculated_at?: string;
  financial_contribution?: number;
  temporal_contribution?: number;
  text_contribution?: number;
  spatial_contribution?: number;
  network_contribution?: number;
}

export interface ProjectItem {
  project_id: string;
  dataset_version?: string;
  state?: string;
  district?: string;
  constituency?: string;
  mp_name?: string;
  sector?: string;
  status?: string;
  description?: string;
  location?: ProjectLocation | null;
  financial?: ProjectFinancial | null;
  timeline?: ProjectTimeline | null;
  risk_score?: ProjectRiskScore | null;
  audit_priority?: number;
  priority_level?: AuditPriorityLevel;
  why_flagged?: string;
  primary_signals?: string[];
  evidence_status?: string;
  review_status?: string;
  assigned_to?: string | null;
  case_id?: string | null;
  updated_at?: string | null;
}

// ==========================================
// V2 Hybrid Audit Intelligence Types
// ==========================================

export interface CostNormalizationProvenance {
  category?: string;
  sanction_year?: number | null;
  base_year?: number;
  source?: string;
  version?: string;
  key_cost_drivers?: string[];
}

export interface CostNormalizationData {
  is_adjusted: boolean;
  reason: string;
  original_cost: number;
  adjusted_cost: number;
  adjustment_factor: number;
  expected_min: number;
  expected_max: number;
  provenance?: CostNormalizationProvenance;
}

export interface CostDeviationEvaluation {
  signal: string;
  score: number;
  observed_cost: number;
  expected_range_min: number;
  expected_range_max: number;
  adjusted_peer_median: number;
  ratio_to_peer: number;
  deviation_percentage: number;
  is_price_adjusted: boolean;
  reason: string;
}

export interface CostContextResponse {
  project_id: string;
  sector?: string;
  sanction_year?: number | null;
  observed_cost: number;
  normalization: CostNormalizationData;
  deviation_evaluation: CostDeviationEvaluation;
}

export interface ProjectHistorySnapshot {
  run_id: string;
  dataset_version: string;
  model_version: string;
  audit_priority_score: number;
  priority_level: string;
  previous_score?: number | null;
  score_delta: number;
  signals_snapshot?: Record<string, any>;
  contributing_factors?: Record<string, number>;
  change_summary?: string;
  recorded_at?: string | null;
}

export interface ProjectHistoryResponse {
  project_id: string;
  total_snapshots: number;
  snapshots: ProjectHistorySnapshot[];
}

export interface ContractorProfileData {
  entity_id: string;
  name: string;
  normalized_name?: string;
  aliases?: string[];
  state?: string;
  primary_district?: string;
  total_projects: number;
  total_sanctioned_amount: number;
  primary_sector?: string;
  sector_distribution?: Record<string, number>;
  sector_value_distribution?: Record<string, number>;
  avg_project_value?: number;
  median_project_value?: number;
  value_mad?: number;
  avg_duration_days?: number;
  median_duration_days?: number;
  projects_by_year?: Record<string, number>;
  projects_by_status?: Record<string, number>;
  projects_by_district?: Record<string, number>;
  historical_high_priority_count?: number;
  last_updated?: string | null;
}

export interface GroundedGuidelineClause {
  clause_id: string;
  title: string;
  content: string;
  category: string;
  relevance_score?: number;
}

export interface CopilotBriefResponse {
  project_id: string;
  query: string;
  audit_priority_score: number;
  priority_level: string;
  observations: string[];
  supporting_signals: Array<string | { domain?: string; reason?: string; contribution?: number }>;
  data_gaps_and_uncertainties: string[];
  grounded_guideline_clauses: GroundedGuidelineClause[];
  recommended_next_checks: string[];
  disclaimer: string;
  generated_at: string;
}

export interface AnalysisRunItem {
  id: number;
  run_id: string;
  dataset_version?: string | null;
  model_version?: string | null;
  status: string;
  total_analyzed: number;
  anomalies_flagged: number;
  started_at?: string | null;
  completed_at?: string | null;
  configuration?: Record<string, any> | null;
}

export interface DatasetVersionItem {
  dataset_version: string;
  source_id?: string;
  source_name?: string;
  file_path?: string;
  total_records: number;
  valid_records: number;
  invalid_records: number;
  data_quality_score: number;
  ingested_at?: string | null;
  source_checksum?: string | null;
}

export interface IngestionChangeItem {
  dataset_version: string;
  project_id: string;
  change_type: string;
  changed_fields?: string[];
  checksum?: string;
  detected_at?: string | null;
}

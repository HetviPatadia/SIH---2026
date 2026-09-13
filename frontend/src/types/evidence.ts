export type EvidenceStatusTier = 'VERIFIED' | 'NEEDS_REVIEW' | 'INCONSISTENT' | 'UNAVAILABLE' | 'PENDING';
export type EvidenceConfidenceTier = 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT';

export interface EvidenceFileDetails {
  file_name: string;
  mime_type: string;
  file_size: number;
  sha256: string;
  width?: number | null;
  height?: number | null;
}

export interface EvidenceMetadataRecord {
  capture_time?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  device_make?: string | null;
  device_model?: string | null;
  has_gps: boolean;
  has_timestamp: boolean;
  metadata_reliability: number;
  raw_exif?: Record<string, unknown>;
}

export interface EvidenceHashes {
  sha256?: string;
  phash?: string;
  dhash?: string;
  ahash?: string;
}

export interface ProjectEvidenceItem {
  evidence_id: string;
  project_id: string;
  evidence_type: string;
  title?: string;
  description?: string;
  source?: string;
  created_at: string;
  file?: EvidenceFileDetails;
  metadata_record?: EvidenceMetadataRecord;
  hashes?: EvidenceHashes;
}

export interface SimilarEvidenceMatch {
  target_evidence_id: string;
  matched_evidence_id: string;
  matched_project_id: string;
  matched_project_title: string;
  matched_district: string;
  matched_contractor?: string;
  is_same_contractor: boolean;
  similarity_score: number;
  similarity_percentage: number;
  similarity_method: string;
  match_tier: string;
  distance_meters?: number;
  evidence_type: string;
}

export interface EvidenceSignal {
  id: number;
  project_id: string;
  evidence_id?: string | null;
  signal_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  explanation: string;
  created_at: string;
  evidence_details?: Record<string, unknown>;
}

export interface EvidenceConfidenceSummary {
  project_id: string;
  overall_confidence: number;
  completeness_score: number;
  metadata_reliability: number;
  data_freshness: number;
  confidence_level: EvidenceConfidenceTier;
  reasons?: string[];
  calculated_at: string;
}

export interface EvidenceSummaryResponse {
  total_evidence_items: number;
  projects_with_evidence: number;
  potential_reuse_signals: number;
  location_inconsistency_signals: number;
  temporal_inconsistency_signals: number;
  high_priority_evidence_cases: number;
}

export interface GlobalEvidenceItem {
  evidence_id: string;
  project_id: string;
  project_title: string;
  district?: string | null;
  state?: string | null;
  evidence_type: string;
  title?: string | null;
  source?: string | null;
  created_at: string;
  status: string;
  confidence?: number | null;
  confidence_level?: string | null;
  similarity_signal: boolean;
  location_consistency: string;
  temporal_consistency: string;
  has_metadata: boolean;
  signals_count: number;
  signals: string[];
}

export interface PaginatedGlobalEvidenceResponse {
  total: number;
  page: number;
  page_size: number;
  items: GlobalEvidenceItem[];
}

export interface EvidenceComparisonItemData {
  evidence_id: string;
  project_id: string;
  project_title: string;
  district?: string | null;
  contractor?: string;
  evidence_type: string;
  title?: string | null;
  sha256?: string | null;
  capture_time?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface SimilarityAnalysis {
  similarity_score: number;
  similarity_percentage: number;
  similarity_method: string;
  match_tier: string;
  sha256_match: boolean;
  phash_similarity: number;
  dhash_similarity: number;
  ahash_similarity: number;
  visual_embedding_similarity: number;
  same_contractor: boolean;
  same_district: boolean;
  gps_distance_meters?: number | null;
  time_discrepancy_days?: number | null;
}

export interface ConsistencySummary {
  is_suspect_reuse: boolean;
  exact_file_reuse: boolean;
  potential_visual_reuse: boolean;
  finding: string;
  location_inconsistent?: boolean;
  temporal_inconsistent?: boolean;
}

export interface EvidenceComparisonResponse {
  comparison_type: string;
  evidence_a?: EvidenceComparisonItemData | null;
  evidence_b?: EvidenceComparisonItemData | null;
  project_a?: Record<string, unknown> | null;
  project_b?: Record<string, unknown> | null;
  similarity_analysis: SimilarityAnalysis;
  consistency_summary: ConsistencySummary;
}

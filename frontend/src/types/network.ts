export type GraphNodeType = 'PROJECT' | 'CONTRACTOR' | 'DISTRICT' | 'EVIDENCE' | 'PHOTO' | 'AGENCY';

export type GraphEdgeRelation = 
  | 'AWARDED_TO' 
  | 'LOCATED_IN' 
  | 'ASSOCIATED_WITH' 
  | 'POTENTIAL_EVIDENCE_REUSE' 
  | 'REPEATED_ASSOCIATION'
  | 'HAS_EVIDENCE'
  | 'SIMILAR_TO';

export interface GraphNodeMetadata {
  project_id?: string;
  district?: string;
  sector?: string;
  sanctioned_amount?: number;
  title?: string;
  entity_id?: string;
  name?: string;
  project_count?: number;
  average_audit_priority?: number;
  high_priority_projects?: number;
  registration_no?: string;
  primary_district?: string;
  evidence_id?: string;
  signal_type?: string;
  matched_evidence_id?: string;
  matched_project_id?: string;
  similarity_method?: string;
  [key: string]: unknown;
}

export interface GraphNode {
  id: string;
  label: string;
  type: GraphNodeType;
  risk_level?: string; // LOW, MEDIUM, HIGH, CRITICAL
  score?: number;
  metadata?: GraphNodeMetadata;
}

export interface GraphEdge {
  source: string;
  target: string;
  relation: string;
  weight?: number;
  explanation?: string;
  relationship_count?: number;
  label?: string;
}

export interface NetworkGraphMetrics {
  node_count: number;
  edge_count: number;
  project_count: number;
  contractor_count: number;
  district_count: number;
  evidence_count?: number;
}

export interface NetworkGraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
  status: string;
  reason?: string;
  metrics?: NetworkGraphMetrics;
}

export interface ContractorSummary {
  total_projects: number;
  district_count: number;
  high_priority_projects: number;
  average_audit_priority: number;
  total_sanctioned_amount: number;
}

export interface ContractorProjectItem {
  project_id: string;
  district?: string;
  sector?: string;
  status?: string;
  sanctioned_amount?: number;
  audit_priority?: number;
  priority_level?: string;
  title?: string;
}

export interface ContractorInvestigationResponse {
  contractor: string;
  entity_id: string;
  summary: ContractorSummary;
  projects: ContractorProjectItem[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  status: string;
  reason?: string;
  metrics?: Record<string, unknown>;
}

export interface GraphQueryParams {
  project_id?: string;
  contractor?: string;
  district?: string;
  priority?: string;
  node_type?: string;
  depth?: number;
  limit?: number;
  limit_projects?: number;
  [key: string]: string | number | boolean | null | undefined;
}

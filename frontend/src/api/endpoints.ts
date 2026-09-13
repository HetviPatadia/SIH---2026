import { apiClient, getBaseUrl } from './client';
import type { 
  SystemHealthResponse, 
  AnomalySummaryResponse, 
  PaginatedResponse 
} from '../types/api';
import type { 
  ProjectItem,
  CostContextResponse,
  ProjectHistoryResponse,
  ContractorProfileData,
  CopilotBriefResponse,
  AnalysisRunItem,
  DatasetVersionItem,
  IngestionChangeItem,
} from '../types/project';
import type { 
  ProjectEvidenceItem, 
  SimilarEvidenceMatch, 
  EvidenceSignal,
  EvidenceSummaryResponse,
  PaginatedGlobalEvidenceResponse,
  EvidenceComparisonResponse
} from '../types/evidence';
import type { InvestigationCase, CaseSummaryResponse } from '../types/investigation';
import type { RiskExplanationResponse } from '../types/explanation';
import type { NetworkGraphResponse, ContractorInvestigationResponse, GraphQueryParams } from '../types/network';
import type { 
  MapMarkerItem, 
  MapClusterItem, 
  MapSummaryData, 
  NearbyProjectsResponse, 
  LocationConsistencyResponse 
} from '../types/gis';

export const api = {
  // System Health & Monitoring
  system: {
    getHealth: () => apiClient<SystemHealthResponse>('/api/system/health'),
    getStatus: () => apiClient<{ system: string; role: string; compliance: Record<string, boolean> }>('/api/system/status'),
  },

  // Anomalies & KPIs
  anomalies: {
    getSummary: () => apiClient<AnomalySummaryResponse>('/api/anomalies/summary'),
  },

  // Projects
  projects: {
    list: (params?: {
      page?: number;
      page_size?: number;
      priority?: string;
      district?: string;
      sector?: string;
      search?: string;
      status?: string;
      review_status?: string;
      evidence_status?: string;
      sort_by?: string;
      sort_order?: string;
    }) => 
      apiClient<PaginatedResponse<ProjectItem>>('/api/projects', { params }),
    getById: (projectId: string) => 
      apiClient<ProjectItem>(`/api/projects/${projectId}`),
    getHighPriority: (limit = 10) => 
      apiClient<ProjectItem[]>('/api/projects/high-priority', { params: { limit } }),
    getNearby: (projectId: string, radiusKm = 5.0, limit = 20) => 
      apiClient<NearbyProjectsResponse>(
        `/api/projects/${projectId}/nearby`, 
        { params: { radius_km: radiusKm, limit } }
      ),
    getCostContext: (projectId: string) =>
      apiClient<CostContextResponse>(`/api/projects/${projectId}/cost-context`),
    getHistory: (projectId: string) =>
      apiClient<ProjectHistoryResponse>(`/api/projects/${projectId}/history`),
    getSimilar: (projectId: string, topK = 10) =>
      apiClient<{ project_id: string; retrieval_method: string; similar_projects: any[] }>(
        `/api/projects/${projectId}/similar`,
        { params: { top_k: topK } }
      ),
  },

  // Explainable AI (XAI)
  explanations: {
    getById: (projectId: string) => 
      apiClient<RiskExplanationResponse>(`/api/explanations/${projectId}`),
  },

  // Evidence Intelligence
  evidence: {
    list: (params?: {
      page?: number;
      page_size?: number;
      search?: string;
      project_id?: string;
      evidence_type?: string;
      status?: string;
      confidence_level?: string;
      district?: string;
      has_similarity_signal?: boolean;
      has_location_signal?: boolean;
      has_temporal_signal?: boolean;
    }) =>
      apiClient<PaginatedGlobalEvidenceResponse>('/api/evidence', { params }),
    getProjectEvidence: (projectId: string) => 
      apiClient<ProjectEvidenceItem[]>(`/api/projects/${projectId}/evidence`),
    getSimilarEvidence: (projectId: string, minSimilarity = 0.75, limit = 10) => 
      apiClient<SimilarEvidenceMatch[]>(`/api/projects/${projectId}/evidence/similar`, { 
        params: { min_similarity: minSimilarity, limit } 
      }),
    getSignals: (projectId: string) => 
      apiClient<EvidenceSignal[]>(`/api/projects/${projectId}/evidence-signals`),
    getById: (evidenceId: string) => 
      apiClient<ProjectEvidenceItem>(`/api/evidence/${evidenceId}`),
    getFileUrl: (evidenceId: string) => {
      const baseUrl = getBaseUrl();
      return `${baseUrl}/api/evidence/${evidenceId}/file`;
    },
    getSummary: () => 
      apiClient<EvidenceSummaryResponse>('/api/evidence/summary'),
    getHighPriorityCases: () => 
      apiClient<Array<{ project_id: string; evidence_id: string; signal_type: string; severity: string; confidence: number; explanation: string }>>('/api/evidence/cases/high-priority'),
    compare: (payload: { evidence_id_a?: string; evidence_id_b?: string; project_id_a?: string; project_id_b?: string }) => 
      apiClient<EvidenceComparisonResponse>('/api/evidence/compare', { 
        method: 'POST', 
        body: JSON.stringify(payload) 
      }),
    compareProjects: (project_id_a: string, project_id_b: string) => 
      apiClient<EvidenceComparisonResponse>('/api/evidence/compare', { 
        method: 'POST', 
        body: JSON.stringify({ project_id_a, project_id_b }) 
      }),
  },

  // Investigations Workflow
  investigations: {
    getSummary: () => 
      apiClient<CaseSummaryResponse>('/api/investigations/summary'),
    list: (params?: { status?: string; limit?: number }) => 
      apiClient<InvestigationCase[]>('/api/investigations', { params }),
    getById: (caseId: string) => 
      apiClient<InvestigationCase>(`/api/investigations/${caseId}`),
    addNote: (caseId: string, author: string, note_text: string, action_taken?: string) => 
      apiClient<unknown>(`/api/investigations/${caseId}/notes`, { 
        method: 'POST', 
        body: JSON.stringify({ author, note_text, action_taken }) 
      }),
    updateStatus: (caseId: string, status: string, notes?: string, assigned_to?: string) => 
      apiClient<InvestigationCase>(`/api/investigations/${caseId}/status`, { 
        method: 'PATCH', 
        body: JSON.stringify({ status, notes, assigned_to }) 
      }),
  },

  // Maps / Spatial GIS
  maps: {
    getSummary: () => 
      apiClient<MapSummaryData>('/api/maps/summary'),
    getProjects: (params?: { district?: string; priority?: string; sector?: string; state?: string; limit?: number }) => 
      apiClient<{ total_markers: number; markers: MapMarkerItem[] }>('/api/maps/projects', { params }),
    getMarkers: (params?: { district?: string; priority?: string; sector?: string; state?: string; limit?: number }) => 
      apiClient<{ total_markers: number; markers: MapMarkerItem[] }>('/api/maps/projects', { params }),
    getClusters: (params?: { radius_km?: number; min_projects?: number; district?: string; priority?: string }) => 
      apiClient<MapClusterItem[]>('/api/maps/clusters', { params }),
    getLocationConsistency: (projectId: string) =>
      apiClient<LocationConsistencyResponse>(`/api/maps/projects/${projectId}/location-consistency`),
  },

  // Network / Entity Nexus
  network: {
    getGraph: (params?: GraphQueryParams) => 
      apiClient<NetworkGraphResponse>('/api/network/graph', { params }),
    getContractor: (name: string) => 
      apiClient<ContractorInvestigationResponse>(`/api/network/contractor/${encodeURIComponent(name)}`),
    getContractorProfile: (contractorIdOrName: string) =>
      apiClient<ContractorProfileData>(`/api/network/contractors/${encodeURIComponent(contractorIdOrName)}/profile`),
    getContractorSectors: (contractorIdOrName: string) =>
      apiClient<{ entity_id: string; contractor_name: string; primary_sector: string; sector_share_counts: Record<string, number>; sector_share_values: Record<string, number> }>(
        `/api/network/contractors/${encodeURIComponent(contractorIdOrName)}/sectors`
      ),
    getContractorHistory: (contractorIdOrName: string) =>
      apiClient<{ entity_id: string; contractor_name: string; total_historical_projects: number; history: any[] }>(
        `/api/network/contractors/${encodeURIComponent(contractorIdOrName)}/history`
      ),
    getProjectEvidenceGraph: (projectId: string) => 
      apiClient<{ nodes: Array<Record<string, unknown>>; edges: Array<Record<string, unknown>> }>(`/api/projects/${projectId}/evidence-graph`),
  },

  // AI Investigation Copilot
  copilot: {
    run: (projectId: string, query?: string) =>
      apiClient<CopilotBriefResponse>('/api/investigation/copilot', {
        method: 'POST',
        body: JSON.stringify({ project_id: projectId, query }),
      }),
    getContext: (projectId: string) =>
      apiClient<Record<string, any>>(`/api/investigation/${projectId}/context`),
  },

  // Analysis Runs Provenance
  analysis: {
    listRuns: (params?: { status?: string; limit?: number }) =>
      apiClient<AnalysisRunItem[]>('/api/analysis/runs', { params }),
    getRun: (runId: string) =>
      apiClient<AnalysisRunItem>(`/api/analysis/runs/${runId}`),
  },

  // Data Ingestion & Quality
  data: {
    getVersions: () =>
      apiClient<{ total_versions: number; versions: DatasetVersionItem[] }>('/api/data/versions'),
    getQuality: () =>
      apiClient<{ datasets: any[] }>('/api/data/quality'),
    getChanges: (params?: { dataset_version?: string; change_type?: string; limit?: number }) =>
      apiClient<{ total_returned: number; changes: IngestionChangeItem[] }>('/api/data/changes', { params }),
  },

  // Public Assistant & Discovery Portal
  public: {
    assistantChat: (payload: { message: string; conversation_id?: string; active_filters?: Record<string, any>; language?: string }) =>
      apiClient<{
        answer: string;
        language: string;
        intent: string;
        filters_applied: Record<string, any>;
        result_count: number;
        source: string;
        actions: Array<{ type: string; filters: Record<string, any> }>;
        previews: Array<Record<string, any>>;
        is_ambiguous?: boolean;
        ambiguous_options?: string[];
      }>('/api/public/assistant/chat', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getStates: () =>
      apiClient<string[]>('/api/public/locations/states'),
    getDistricts: (state?: string) =>
      apiClient<string[]>('/api/public/locations/districts', { params: { state } }),
    getConstituencies: (state?: string, district?: string) =>
      apiClient<string[]>('/api/public/locations/constituencies', { params: { state, district } }),
    getBlocks: (state?: string, district?: string, constituency?: string) =>
      apiClient<string[]>('/api/public/locations/blocks', { params: { state, district, constituency } }),
    getVillages: (state?: string, district?: string, constituency?: string, block?: string) =>
      apiClient<string[]>('/api/public/locations/villages', { params: { state, district, constituency, block } }),
    getStats: (params?: Record<string, any>) =>
      apiClient<{
        total_projects: number;
        total_sanctioned: number;
        total_expenditure: number;
        completed_works: number;
        in_progress_works: number;
      }>('/api/public/projects/stats', { params }),
    getMapProjects: (params?: Record<string, any>) =>
      apiClient<Array<Record<string, any>>>('/api/public/projects/map', { params }),
    listProjects: (params?: Record<string, any>) =>
      apiClient<{ total: number; page: number; page_size: number; items: Array<Record<string, any>> }>('/api/public/projects', { params }),
    getProject: (projectId: string) =>
      apiClient<Record<string, any>>(`/api/public/projects/${projectId}`),
    submitGrievance: (payload: Record<string, any>) =>
      apiClient<{ ticket_number: string; grievance_id: string; status: string; message: string }>('/api/public/grievances', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    trackGrievance: (ticketNumber: string) =>
      apiClient<{
        ticket_number: string;
        project_id: string;
        project_title: string;
        company_name?: string;
        contractor_name?: string;
        issue_type: string;
        description: string;
        citizen_name: string;
        status: string;
        status_description: string;
        created_at: string;
      }>(`/api/public/grievances/track/${encodeURIComponent(ticketNumber)}`),
    submitReview: (payload: {
      project_id: string;
      project_title?: string;
      overall_rating: number;
      quality_rating: number;
      timeline_rating: number;
      utility_rating: number;
      transparency_rating: number;
      feedback_text: string;
      reviewer_name?: string;
      reviewer_contact?: string;
      would_recommend?: boolean;
    }) =>
      apiClient<{ message: string; review_id: string; project_id: string; summary: any }>('/api/public/reviews', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getProjectReviews: (projectId: string) =>
      apiClient<{
        project_id: string;
        total_reviews: number;
        average_overall: number;
        recommendation_percentage: number;
        factors: {
            overall: number;
            quality: number;
            timeline: number;
            utility: number;
            transparency: number;
        };
        reviews: Array<{
            review_id: string;
            project_id: string;
            project_title?: string;
            overall_rating: number;
            quality_rating: number;
            timeline_rating: number;
            utility_rating: number;
            transparency_rating: number;
            feedback_text: string;
            reviewer_name?: string;
            would_recommend: boolean;
            created_at: string;
        }>;
      }>(`/api/public/reviews/project/${encodeURIComponent(projectId)}`),
  },
};

export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: 'SUCCESS' | 'ERROR';
}

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  page_size: number;
  items: T[];
}

export interface ApiError {
  detail: string;
  status_code?: number;
}

export interface SystemHealthResponse {
  status: 'OPERATIONAL' | 'DEGRADED' | 'DOWN';
  project_name: string;
  version: string;
  timestamp: string;
  components: {
    database: string;
    ai_engine: string;
    pdf_generator: string;
    spatial_service: string;
    network_service: string;
  };
  database_metrics: {
    total_projects_loaded: number;
    total_risk_scores_computed: number;
    last_analysis_run_id: string | null;
    last_run_status: string | null;
  };
}

export interface AnomalySummaryResponse {
  total_projects: number;
  high_priority_flags: number;
  priority_breakdown: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    CRITICAL: number;
  };
  financials: {
    total_sanctioned_funds: number;
    total_expenditure: number;
    overall_utilization_ratio: number;
  };
  top_flagged_sectors: Array<{ sector: string; flagged_count: number }>;
}

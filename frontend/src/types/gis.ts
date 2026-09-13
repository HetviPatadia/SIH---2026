export interface MapMarkerItem {
  project_id: string;
  title: string;
  latitude: number;
  longitude: number;
  priority_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | string;
  unified_score: number;
  sanctioned_amount: number;
  district: string;
  sector: string;
  state?: string | null;
  spatial_anomaly_signal?: string | null;
}

export interface MapClusterItem {
  cluster_id: string;
  center_lat: number;
  center_lon: number;
  project_count: number;
  avg_risk_score: number;
  district: string;
  anomaly_flag_count: number;
  radius_km?: number;
  high_priority_count?: number;
  critical_priority_count?: number;
  projects?: string[];
}

export interface NearbyProjectItem {
  project_id: string;
  title: string;
  distance_km: number;
  distance_meters: number;
  latitude?: number;
  longitude?: number;
  district?: string;
  sector?: string;
  priority_level?: string;
  audit_priority?: number;
  sanctioned_amount?: number;
}

export interface NearbyProjectsResponse {
  project_id: string;
  nearby: NearbyProjectItem[];
}

export interface MapSummaryData {
  total_projects: number;
  projects_with_coordinates: number;
  projects_without_coordinates: number;
  high_priority_projects: number;
  critical_priority_projects: number;
  cluster_count: number;
  spatial_signal_count: number;
}

export interface LocationConsistencyRecord {
  evidence_id: string;
  title: string;
  evidence_type: string;
  has_gps: boolean;
  evidence_location?: {
    latitude: number | null;
    longitude: number | null;
  } | null;
  distance_meters?: number | null;
  consistency: 'CONSISTENT' | 'INCONSISTENT' | 'UNAVAILABLE' | string;
}

export interface LocationConsistencyResponse {
  project_id: string;
  has_project_coords: boolean;
  project_location?: {
    latitude: number | null;
    longitude: number | null;
  } | null;
  evidence_count: number;
  evidence_records: LocationConsistencyRecord[];
  overall_consistency: 'CONSISTENT' | 'INCONSISTENT' | 'UNAVAILABLE' | string;
}

export interface GISFilterState {
  searchQuery: string;
  state: string;
  district: string;
  sector: string;
  priority: string;
  radiusKm: number;
  showClusters: boolean;
}

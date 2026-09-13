import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api/endpoints';
import { useTheme } from '../../hooks/useTheme';
import { GISHeader } from './components/GISHeader';
import { GISFiltersBar } from './components/GISFiltersBar';
import { GISMapCanvas, GISMapCanvasRef } from './components/GISMapCanvas';
import { GISInspectorDrawer } from './components/GISInspectorDrawer';
import { LoadingState } from '../../components/feedback/LoadingState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { useInvestigation } from '../../context/InvestigationContext';
import type { 
  MapMarkerItem, 
  MapClusterItem, 
  MapSummaryData, 
  NearbyProjectItem,
  LocationConsistencyResponse,
  GISFilterState 
} from '../../types/gis';

export const GISPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { resolvedTheme } = useTheme();
  const { setActiveProject } = useInvestigation();
  const mapCanvasRef = useRef<GISMapCanvasRef>(null);
  const initialUrlProjectHandledRef = useRef<string | null>(null);

  // Core Data State
  const [summary, setSummary] = useState<MapSummaryData | null>(null);
  const [markers, setMarkers] = useState<MapMarkerItem[]>([]);
  const [clusters, setClusters] = useState<MapClusterItem[]>([]);
  const [selectedProject, setSelectedProject] = useState<MapMarkerItem | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<MapClusterItem | null>(null);
  const [nearbyProjects, setNearbyProjects] = useState<NearbyProjectItem[]>([]);
  const [consistencyData, setConsistencyData] = useState<LocationConsistencyResponse | null>(null);

  // Status State
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingNearby, setIsLoadingNearby] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filter State
  const [filters, setFilters] = useState<GISFilterState>({
    searchQuery: '',
    state: '',
    district: '',
    sector: '',
    priority: 'ALL',
    radiusKm: 1.0,
    showClusters: true,
  });

  const urlProjectId = searchParams.get('projectId');

  // 1. Initial Data Fetch
  const loadSpatialData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [sumRes, projRes, clustRes] = await Promise.all([
        api.maps.getSummary().catch(() => null),
        api.maps.getProjects({ limit: 2500 }),
        api.maps.getClusters({ radius_km: filters.radiusKm, min_projects: 3 }),
      ]);

      if (sumRes) setSummary(sumRes);
      if (projRes?.markers) setMarkers(projRes.markers);
      if (clustRes) setClusters(clustRes);
    } catch (err: unknown) {
      console.error('Failed to load spatial GIS data:', err);
      setError('Unable to load spatial information from the backend service.');
    } finally {
      setIsLoading(false);
    }
  }, [filters.radiusKm]);

  useEffect(() => {
    loadSpatialData();
  }, [loadSpatialData]);

  // 2. Fetch Nearby Projects & Location Consistency for Selected Project
  const handleSelectProject = useCallback(async (project: MapMarkerItem) => {
    setActiveProject(project.project_id, project.title);
    setSelectedProject(project);
    setSelectedCluster(null);

    // Update URL query parameter without full reload
    setSearchParams((prev) => {
      const updated = new URLSearchParams(prev);
      updated.set('projectId', project.project_id);
      return updated;
    });

    // Fetch nearby projects
    setIsLoadingNearby(true);
    try {
      const [nearbyRes, consistencyRes] = await Promise.all([
        api.projects.getNearby(project.project_id, 5.0).catch(() => null),
        api.maps.getLocationConsistency(project.project_id).catch(() => null),
      ]);

      if (nearbyRes?.nearby) {
        setNearbyProjects(nearbyRes.nearby);
      } else {
        setNearbyProjects([]);
      }

      if (consistencyRes) {
        setConsistencyData(consistencyRes);
      } else {
        setConsistencyData(null);
      }
    } catch (err) {
      console.error('Failed to load nearby projects:', err);
      setNearbyProjects([]);
      setConsistencyData(null);
    } finally {
      setIsLoadingNearby(false);
    }
  }, [setSearchParams]);

  // Handle selection by ID (e.g. from nearby list or cluster list)
  const handleSelectProjectId = useCallback(async (projectId: string) => {
    // Check if in current markers list
    const found = markers.find((m) => m.project_id === projectId);
    if (found) {
      handleSelectProject(found);
      if (mapCanvasRef.current && found.latitude && found.longitude) {
        mapCanvasRef.current.focusProject(found.latitude, found.longitude, 14);
      }
    } else {
      // Fetch project details from API
      try {
        const p = await api.projects.getById(projectId);
        if (p && p.location && p.location.latitude && p.location.longitude) {
          const newMarker: MapMarkerItem = {
            project_id: p.project_id,
            title: p.description || p.project_id,
            latitude: p.location.latitude,
            longitude: p.location.longitude,
            priority_level: p.risk_score?.priority_level || 'LOW',
            unified_score: p.risk_score?.unified_score || 0,
            sanctioned_amount: p.financial?.sanctioned_amount || 0,
            district: p.district || '',
            sector: p.sector || '',
            state: p.state || null,
          };
          handleSelectProject(newMarker);
          if (mapCanvasRef.current) {
            mapCanvasRef.current.focusProject(newMarker.latitude, newMarker.longitude, 14);
          }
        }
      } catch (err) {
        console.error('Failed to locate project by ID:', err);
      }
    }
  }, [markers, handleSelectProject]);

  // 3. Auto-Select Project from URL Param on Load
  useEffect(() => {
    if (!urlProjectId || markers.length === 0) return;
    if (initialUrlProjectHandledRef.current === urlProjectId) return;
    initialUrlProjectHandledRef.current = urlProjectId;

    const matched = markers.find((m) => m.project_id === urlProjectId);
    if (matched) {
      handleSelectProject(matched);
      if (mapCanvasRef.current && matched.latitude && matched.longitude) {
        mapCanvasRef.current.focusProject(matched.latitude, matched.longitude, 14);
      }
    } else {
      handleSelectProjectId(urlProjectId);
    }
  }, [urlProjectId, markers, handleSelectProject, handleSelectProjectId]);

  // 4. Cluster Selection
  const handleSelectCluster = useCallback((cluster: MapClusterItem) => {
    setSelectedCluster(cluster);
    setSelectedProject(null);
    setNearbyProjects([]);
    setConsistencyData(null);
    if (mapCanvasRef.current && cluster.center_lat && cluster.center_lon) {
      mapCanvasRef.current.focusProject(cluster.center_lat, cluster.center_lon, 12);
    }
  }, []);

  // 5. Clear Project Selection
  const handleClearSelectedProject = useCallback(() => {
    setSelectedProject(null);
    setSelectedCluster(null);
    setNearbyProjects([]);
    setConsistencyData(null);
    setSearchParams((prev) => {
      const updated = new URLSearchParams(prev);
      updated.delete('projectId');
      return updated;
    });
  }, [setSearchParams]);

  // 6. Contextual Dropdown Options
  const availableStates = useMemo(() => {
    const set = new Set<string>();
    markers.forEach((m) => {
      if (m.state && m.state.trim()) set.add(m.state.trim());
    });
    return Array.from(set).sort();
  }, [markers]);

  const availableDistricts = useMemo(() => {
    const set = new Set<string>();
    const stateFilter = filters.state.trim().toLowerCase();
    markers.forEach((m) => {
      const mState = (m.state || '').trim().toLowerCase();
      if (!stateFilter || mState === stateFilter) {
        if (m.district && m.district.trim()) set.add(m.district.trim());
      }
    });
    return Array.from(set).sort();
  }, [markers, filters.state]);

  const availableSectors = useMemo(() => {
    const set = new Set<string>();
    const stateFilter = filters.state.trim().toLowerCase();
    const districtFilter = filters.district.trim().toLowerCase();
    markers.forEach((m) => {
      const mState = (m.state || '').trim().toLowerCase();
      const mDistrict = (m.district || '').trim().toLowerCase();
      if (!stateFilter || mState === stateFilter) {
        if (!districtFilter || mDistrict === districtFilter) {
          if (m.sector && m.sector.trim()) set.add(m.sector.trim());
        }
      }
    });
    return Array.from(set).sort();
  }, [markers, filters.state, filters.district]);

  // 7. Filter Markers Client-Side
  const filteredMarkers = useMemo(() => {
    const stateFilter = filters.state.trim().toLowerCase();
    const districtFilter = filters.district.trim().toLowerCase();
    const sectorFilter = filters.sector.trim().toLowerCase();
    const query = filters.searchQuery.toLowerCase().trim();

    return markers.filter((m) => {
      // 0. Coordinate validity check: reject markers with missing, NaN, or (0,0) coordinates
      if (!m.latitude || !m.longitude || isNaN(m.latitude) || isNaN(m.longitude)) {
        return false;
      }
      if (Math.abs(m.latitude) < 0.0001 && Math.abs(m.longitude) < 0.0001) {
        return false;
      }

      // 1. Search query
      if (query) {
        const matchesId = (m.project_id || '').toLowerCase().includes(query);
        const matchesTitle = (m.title || '').toLowerCase().includes(query);
        const matchesDist = (m.district || '').toLowerCase().includes(query);
        const matchesState = (m.state || '').toLowerCase().includes(query);
        const matchesSector = (m.sector || '').toLowerCase().includes(query);
        if (!matchesId && !matchesTitle && !matchesDist && !matchesState && !matchesSector) {
          return false;
        }
      }

      // 2. Priority
      if (filters.priority && filters.priority !== 'ALL') {
        const pLevel = (m.priority_level || '').toUpperCase();
        if (filters.priority === 'HIGH,CRITICAL') {
          if (pLevel !== 'HIGH' && pLevel !== 'CRITICAL') return false;
        } else if (pLevel !== filters.priority.toUpperCase()) {
          return false;
        }
      }

      // 3. State (Case-insensitive)
      if (stateFilter && (m.state || '').trim().toLowerCase() !== stateFilter) {
        return false;
      }

      // 4. District (Case-insensitive)
      if (districtFilter && (m.district || '').trim().toLowerCase() !== districtFilter) {
        return false;
      }

      // 5. Sector (Case-insensitive)
      if (sectorFilter && (m.sector || '').trim().toLowerCase() !== sectorFilter) {
        return false;
      }

      return true;
    });
  }, [markers, filters]);

  // 8. Filter Clusters so clusters only show if their projects match
  const filteredClusters = useMemo(() => {
    if (!filters.showClusters) return [];

    const visibleProjectIds = new Set(filteredMarkers.map((m) => m.project_id));
    const stateFilter = filters.state.trim().toLowerCase();
    const districtFilter = filters.district.trim().toLowerCase();

    return clusters.filter((c) => {
      // District filter
      if (districtFilter && (c.district || '').trim().toLowerCase() !== districtFilter) {
        return false;
      }

      // State filter (verify cluster district belongs to selected state)
      if (stateFilter) {
        const clusterInState = markers.some(
          (m) =>
            (m.state || '').trim().toLowerCase() === stateFilter &&
            (m.district || '').trim().toLowerCase() === (c.district || '').trim().toLowerCase()
        );
        if (!clusterInState) return false;
      }

      // Priority filter
      if (filters.priority === 'HIGH,CRITICAL' || filters.priority === 'CRITICAL' || filters.priority === 'HIGH') {
        if ((c.high_priority_count || 0) === 0 && (c.critical_priority_count || 0) === 0) {
          return false;
        }
      }

      // If search query or sector is active, ensure at least one visible project belongs to this cluster
      if ((filters.searchQuery.trim() || filters.sector) && c.projects && c.projects.length > 0) {
        return c.projects.some((pid) => visibleProjectIds.has(pid));
      }

      return true;
    });
  }, [clusters, filteredMarkers, filters, markers]);

  // 9. Reset selected project if no longer in filtered markers
  useEffect(() => {
    if (selectedProject && !filteredMarkers.some((m) => m.project_id === selectedProject.project_id)) {
      setSelectedProject(null);
      setNearbyProjects([]);
      setConsistencyData(null);
      setSearchParams((prev) => {
        const updated = new URLSearchParams(prev);
        updated.delete('projectId');
        return updated;
      }, { replace: true });
    }
  }, [filteredMarkers, selectedProject, setSearchParams]);

  // 10. Filter handlers
  const handleFilterChange = (newFilters: Partial<GISFilterState>) => {
    // When filtering, cleanly dismiss any prior project selection so it never causes random zoom conflicts
    if (selectedProject) {
      setSelectedProject(null);
      setSelectedCluster(null);
      setNearbyProjects([]);
      setConsistencyData(null);
      setSearchParams((prev) => {
        if (prev.has('projectId')) {
          const updated = new URLSearchParams(prev);
          updated.delete('projectId');
          return updated;
        }
        return prev;
      }, { replace: true });
    }

    setFilters((prev) => {
      const updated = { ...prev, ...newFilters };

      // If state changed, check if current district belongs to new state
      if (newFilters.state !== undefined && newFilters.state !== prev.state) {
        if (updated.district) {
          const newSt = (updated.state || '').trim().toLowerCase();
          const curDist = updated.district.trim().toLowerCase();
          const validInNewState = markers.some(
            (m) => (!newSt || (m.state || '').trim().toLowerCase() === newSt) && (m.district || '').trim().toLowerCase() === curDist
          );
          if (!validInNewState) {
            updated.district = '';
          }
        }
      }

      // If district changed or state changed, check if current sector is still valid
      if (newFilters.state !== undefined || newFilters.district !== undefined) {
        if (updated.sector) {
          const newSt = (updated.state || '').trim().toLowerCase();
          const newDist = (updated.district || '').trim().toLowerCase();
          const curSec = updated.sector.trim().toLowerCase();
          const validSector = markers.some(
            (m) =>
              (!newSt || (m.state || '').trim().toLowerCase() === newSt) &&
              (!newDist || (m.district || '').trim().toLowerCase() === newDist) &&
              (m.sector || '').trim().toLowerCase() === curSec
          );
          if (!validSector) {
            updated.sector = '';
          }
        }
      }

      return updated;
    });
  };

  const handleResetFilters = () => {
    setFilters({
      searchQuery: '',
      state: '',
      district: '',
      sector: '',
      priority: 'ALL',
      radiusKm: 1.0,
      showClusters: true,
    });
    setSelectedProject(null);
    setSelectedCluster(null);
    setNearbyProjects([]);
    setConsistencyData(null);
    mapCanvasRef.current?.resetView();
  };

  const handleFitProjects = () => {
    mapCanvasRef.current?.fitBounds();
  };

  const handleResetView = () => {
    mapCanvasRef.current?.resetView();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-background">
      {/* 1. Header with Telemetry & Metrics */}
      <GISHeader
        summary={summary}
        onRefresh={loadSpatialData}
        isLoading={isLoading}
      />

      {/* 2. Compact Forensic Filter & Control Bar — normal document flow, shrink-0 */}
      <div className="shrink-0">
        <GISFiltersBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
          onFitProjects={handleFitProjects}
          onResetView={handleResetView}
          availableDistricts={availableDistricts}
          availableStates={availableStates}
          availableSectors={availableSectors}
          totalVisibleCount={filteredMarkers.length}
          markers={markers}
          onSelectProjectId={handleSelectProjectId}
        />
      </div>

      {/* 3. Main Workspace Layout: Map Canvas (~70%) + Inspector Drawer (~30%) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {isLoading && markers.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <LoadingState 
              message="Fetching verified geodetic coordinates, DBSCAN spatial clusters, and regional distributions..." 
            />
          </div>
        ) : error && markers.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <ErrorState
              title="Unable to load spatial information"
              message={error}
              onRetry={loadSpatialData}
            />
          </div>
        ) : (
          <>
            {/* Map Canvas */}
            <div className="flex-1 h-full min-h-[420px] relative">
              <GISMapCanvas
                ref={mapCanvasRef}
                markers={filteredMarkers}
                clusters={filteredClusters}
                selectedProject={selectedProject}
                nearbyProjects={nearbyProjects}
                showClusters={filters.showClusters}
                activeState={filters.state}
                activeDistrict={filters.district}
                onSelectProject={handleSelectProject}
                onSelectCluster={handleSelectCluster}
                onResetFilters={handleResetFilters}
                resolvedTheme={resolvedTheme}
              />
            </div>

            {/* Inspector Drawer (Approx 25% of workspace) */}
            <div className="w-full lg:w-[320px] xl:w-[350px] h-full max-h-[50vh] lg:max-h-full overflow-y-auto p-4 border-t lg:border-t-0 lg:border-l border-border bg-card/60 backdrop-blur-xs z-10 shrink-0">
              <GISInspectorDrawer
                selectedProject={selectedProject}
                selectedCluster={selectedCluster}
                nearbyProjects={nearbyProjects}
                isLoadingNearby={isLoadingNearby}
                consistencyData={consistencyData}
                onSelectProjectId={handleSelectProjectId}
                onClose={handleClearSelectedProject}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GISPage;

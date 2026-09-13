import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import L from 'leaflet';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RotateCcw,
  Filter 
} from 'lucide-react';
import type { MapMarkerItem, MapClusterItem, NearbyProjectItem } from '../../../types/gis';

export interface GISMapCanvasRef {
  fitBounds: () => void;
  resetView: () => void;
  focusProject: (lat: number, lon: number, zoom?: number) => void;
}

interface GISMapCanvasProps {
  markers: MapMarkerItem[];
  clusters: MapClusterItem[];
  selectedProject: MapMarkerItem | null;
  nearbyProjects: NearbyProjectItem[];
  showClusters: boolean;
  activeState?: string;
  activeDistrict?: string;
  onSelectProject: (project: MapMarkerItem) => void;
  onSelectCluster: (cluster: MapClusterItem) => void;
  onResetFilters?: () => void;
  resolvedTheme: 'light' | 'dark';
}

// Coordinate validation helper
function isValidCoord(lat: number | undefined | null, lon: number | undefined | null): boolean {
  if (lat == null || lon == null) return false;
  if (isNaN(lat) || isNaN(lon)) return false;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return false;
  if (Math.abs(lat) < 0.0001 && Math.abs(lon) < 0.0001) return false;
  return true;
}

// Robust bounding box: strips cross-state spatial anomaly outliers so state zooming is 100% accurate
function computeRobustBounds(items: { latitude: number; longitude: number }[]): L.LatLngBounds | null {
  const valid = items.filter((i) => isValidCoord(i.latitude, i.longitude));
  if (valid.length === 0) return null;
  if (valid.length <= 5) {
    return L.latLngBounds(valid.map((i) => [i.latitude, i.longitude]));
  }

  // Sort latitudes and longitudes
  const lats = valid.map((i) => i.latitude).sort((a, b) => a - b);
  const lons = valid.map((i) => i.longitude).sort((a, b) => a - b);

  // Compute 5th and 95th percentiles to eliminate extreme spatial anomaly outliers
  const n = valid.length;
  const p5Lat = lats[Math.floor(n * 0.05)];
  const p95Lat = lats[Math.min(n - 1, Math.ceil(n * 0.95) - 1)];
  const p5Lon = lons[Math.floor(n * 0.05)];
  const p95Lon = lons[Math.min(n - 1, Math.ceil(n * 0.95) - 1)];

  // Retain points within a 0.5-degree margin around the 5th-95th percentile
  const inliers = valid.filter(
    (i) =>
      i.latitude >= p5Lat - 0.5 &&
      i.latitude <= p95Lat + 0.5 &&
      i.longitude >= p5Lon - 0.5 &&
      i.longitude <= p95Lon + 0.5
  );

  const targets = inliers.length >= 3 ? inliers : valid;
  return L.latLngBounds(targets.map((i) => [i.latitude, i.longitude]));
}

export const GISMapCanvas = forwardRef<GISMapCanvasRef, GISMapCanvasProps>(({
  markers,
  clusters,
  selectedProject,
  nearbyProjects,
  showClusters,
  activeState,
  activeDistrict,
  onSelectProject,
  onSelectCluster,
  onResetFilters,
  resolvedTheme,
}, ref) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const clustersLayerRef = useRef<L.LayerGroup | null>(null);
  const linesLayerRef = useRef<L.LayerGroup | null>(null);
  const leafletMarkersMap = useRef<Map<string, L.Marker>>(new Map());

  // Default India bounds center
  const DEFAULT_CENTER: L.LatLngExpression = [22.0, 79.5];
  const DEFAULT_ZOOM = 5;

  // Expose imperative methods to parent (for Fit and Reset)
  useImperativeHandle(ref, () => ({
    fitBounds: () => {
      if (!mapInstanceRef.current || markers.length === 0) return;
      const bounds = computeRobustBounds(markers);
      if (bounds) {
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
    },
    resetView: () => {
      if (!mapInstanceRef.current) return;
      mapInstanceRef.current.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    },
    focusProject: (lat: number, lon: number, zoom = 14) => {
      if (!mapInstanceRef.current) return;
      if (isValidCoord(lat, lon)) {
        mapInstanceRef.current.flyTo([lat, lon], zoom, { duration: 0.8 });
      }
    },
  }));

  // Keep a stable ref to current markers so geo-filter effect can read them without depending on them
  const markersRef = useRef<MapMarkerItem[]>(markers);
  useEffect(() => {
    markersRef.current = markers;
  }); // intentionally no dep array — just sync every render

  // Geographic Viewport Management: Fit bounds ONLY when State or District filter actually changes
  const prevGeoFilter = useRef<{ state: string; district: string }>({ state: '', district: '' });
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const curState = (activeState || '').trim();
    const curDistrict = (activeDistrict || '').trim();

    // Guard: only move map when geo filter actually changed — NOT when markers reload
    if (prevGeoFilter.current.state === curState && prevGeoFilter.current.district === curDistrict) {
      return;
    }
    prevGeoFilter.current = { state: curState, district: curDistrict };

    // 1. Both filters cleared → restore India overview
    if (!curState && !curDistrict) {
      mapInstanceRef.current.setView(DEFAULT_CENTER, DEFAULT_ZOOM, { animate: true });
      return;
    }

    // 2. Filter markers matching the active geo boundary (read from ref — no reactive dep)
    const currentMarkers = markersRef.current;
    const geoMarkers = currentMarkers.filter((m) => {
      if (!isValidCoord(m.latitude, m.longitude)) return false;
      if (curState && (m.state || '').trim().toLowerCase() !== curState.toLowerCase()) return false;
      if (curDistrict && (m.district || '').trim().toLowerCase() !== curDistrict.toLowerCase()) return false;
      return true;
    });

    if (geoMarkers.length === 0) return;

    // 3. Compute robust inlier bounds (strips cross-state spatial anomaly outliers)
    const bounds = computeRobustBounds(geoMarkers);
    if (bounds) {
      mapInstanceRef.current.fitBounds(bounds, {
        padding: [45, 45],
        maxZoom: curDistrict ? 14 : 11,
        animate: true,
      });
    }
  // Depends ONLY on activeState + activeDistrict — NOT on markers
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeState, activeDistrict]);



  // 1. Initialize Leaflet Map Instance with OpenStreetMap Tiles (100% Free - 0 API Key)
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: false, // Use our custom floating controls
      attributionControl: true,
      minZoom: 3,
      maxZoom: 18,
    });

    // Standard OpenStreetMap Tiles - No Mapbox / Google Maps / MapTiler API key required
    const osmTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    });
    osmTileLayer.addTo(map);
    tileLayerRef.current = osmTileLayer;

    // Layer groups for clean separation
    linesLayerRef.current = L.layerGroup().addTo(map);
    clustersLayerRef.current = L.layerGroup().addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    // Invalidate size after layout settling to eliminate grey tiles
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 250);

    // Dynamic container resize observer
    const ro = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });
    ro.observe(mapContainerRef.current);

    return () => {
      clearTimeout(timer);
      ro.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Invalidate size on theme switch or layout shifts
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.invalidateSize();
    }
  }, [resolvedTheme]);

  // 2. Render Project Markers with Decluttering & Priority Colors
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;
    const layer = markersLayerRef.current;
    layer.clearLayers();
    leafletMarkersMap.current.clear();

    const nearbyIds = new Set(nearbyProjects.map((p) => p.project_id));
    const hasSelection = Boolean(selectedProject);

    markers.forEach((m) => {
      if (!m.latitude || !m.longitude || isNaN(m.latitude) || isNaN(m.longitude)) {
        return;
      }

      const isSelected = selectedProject?.project_id === m.project_id;
      const isNearby = nearbyIds.has(m.project_id);
      const isDimmed = hasSelection && !isSelected && !isNearby;

      // Determine priority color
      let markerColor = '#64748b'; // LOW / Neutral
      let ringColor = 'rgba(100, 116, 139, 0.4)';
      let size = 16;

      if (m.priority_level === 'CRITICAL') {
        markerColor = '#ef4444'; // Red
        ringColor = 'rgba(239, 68, 68, 0.4)';
        size = 20;
      } else if (m.priority_level === 'HIGH') {
        markerColor = '#f59e0b'; // Amber / Orange
        ringColor = 'rgba(245, 158, 11, 0.4)';
        size = 18;
      } else if (m.priority_level === 'MEDIUM') {
        markerColor = '#0d9488'; // Teal / Blue-green
        ringColor = 'rgba(13, 148, 136, 0.4)';
        size = 16;
      }

      if (isSelected) {
        size = 28;
      } else if (isNearby) {
        size = 20;
      }

      const opacity = isDimmed ? 0.3 : 1.0;
      const zIndexOffset = isSelected ? 1000 : isNearby ? 500 : 0;

      const customHtml = `
        <div class="relative flex items-center justify-center cursor-pointer transition-transform duration-150 hover:scale-125" style="width: ${size}px; height: ${size}px; opacity: ${opacity};">
          ${isSelected ? `
            <div class="absolute inset-0 -m-2 rounded-full border-2 border-primary gis-selected-pulse"></div>
            <div class="absolute inset-0 -m-1 rounded-full border-2 border-primary bg-primary/20"></div>
          ` : ''}
          ${isNearby && !isSelected ? `
            <div class="absolute inset-0 -m-1 rounded-full border border-cyan-400 bg-cyan-400/25"></div>
          ` : ''}
          <div style="
            width: ${size}px; 
            height: ${size}px; 
            background-color: ${markerColor}; 
            border: 2px solid ${isSelected ? '#ffffff' : '#0f172a'}; 
            border-radius: 9999px; 
            box-shadow: 0 2px 8px ${ringColor};
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-size: ${isSelected ? '11px' : size > 16 ? '9px' : '0px'};
            font-weight: 700;
          ">
            ${size >= 18 ? Math.round(m.unified_score || 0) : ''}
          </div>
        </div>
      `;

      const icon = L.divIcon({
        html: customHtml,
        className: 'custom-gis-pin',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2],
      });

      const marker = L.marker([m.latitude, m.longitude], { 
        icon, 
        zIndexOffset 
      });

      // Compact Tooltip on Hover
      marker.bindTooltip(`
        <div style="font-family: inherit; line-height: 1.3;">
          <div style="font-weight: 700; color: var(--primary, #0d9488); font-family: monospace;">${m.project_id}</div>
          <div style="font-weight: 600; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${m.title}</div>
          <div style="font-size: 10px; color: #94a3b8;">Priority: <strong>${m.priority_level}</strong> (${m.unified_score.toFixed(0)})</div>
        </div>
      `, {
        direction: 'top',
        offset: [0, -size / 2],
        opacity: 0.95,
      });

      // Interactive Popup on Click
      const amountLakhs = m.sanctioned_amount 
        ? (m.sanctioned_amount / 100000).toFixed(2) 
        : '0.00';

      const popupHtml = `
        <div class="p-3 min-w-[220px] max-w-[280px] space-y-2 text-xs">
          <div class="flex items-center justify-between border-b border-border/50 pb-1.5 gap-2">
            <span class="font-mono text-[11px] font-bold text-primary">${m.project_id}</span>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${
              m.priority_level === 'CRITICAL' ? 'bg-rose-500/20 text-rose-500' :
              m.priority_level === 'HIGH' ? 'bg-amber-500/20 text-amber-500' :
              m.priority_level === 'MEDIUM' ? 'bg-teal-500/20 text-teal-500' :
              'bg-slate-500/20 text-slate-400'
            }">
              ${m.priority_level} (${m.unified_score.toFixed(0)})
            </span>
          </div>
          <p class="font-semibold text-foreground text-xs leading-snug line-clamp-2">
            ${m.title}
          </p>
          <div class="grid grid-cols-2 gap-1 text-[11px] text-muted-foreground pt-1">
            <div>
              <span class="text-[10px] uppercase block">District</span>
              <strong class="text-foreground">${m.district || 'N/A'}</strong>
            </div>
            <div>
              <span class="text-[10px] uppercase block">Sanctioned</span>
              <strong class="text-foreground">₹${amountLakhs} L</strong>
            </div>
          </div>
          <div class="pt-1">
            <span class="text-[10px] uppercase text-muted-foreground block">Sector</span>
            <span class="text-foreground text-[11px] truncate block">${m.sector || 'Uncategorized'}</span>
          </div>
          ${m.spatial_anomaly_signal ? `
            <div class="bg-amber-500/10 border border-amber-500/30 rounded p-1.5 text-[10px] text-amber-600 dark:text-amber-400 flex items-start gap-1">
              <span>⚠️</span>
              <span>${m.spatial_anomaly_signal}</span>
            </div>
          ` : ''}
          <div class="pt-2 border-t border-border/50">
            <button 
              id="popup-select-${m.project_id}" 
              class="w-full py-1 px-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded text-xs transition-colors text-center cursor-pointer"
            >
              Select Project &amp; Trace Nearby Works →
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('popupopen', () => {
        const btn = document.getElementById(`popup-select-${m.project_id}`);
        if (btn) {
          btn.onclick = () => {
            onSelectProject(m);
            marker.closePopup();
          };
        }
      });

      marker.on('click', () => {
        onSelectProject(m);
      });

      marker.addTo(layer);
      leafletMarkersMap.current.set(m.project_id, marker);
    });
  }, [markers, selectedProject, nearbyProjects, onSelectProject]);

  // 3. Render Subtle Connection Lines to Nearby Projects (When Selected)
  useEffect(() => {
    if (!mapInstanceRef.current || !linesLayerRef.current) return;
    const linesLayer = linesLayerRef.current;
    linesLayer.clearLayers();

    if (!selectedProject || !selectedProject.latitude || !selectedProject.longitude) return;
    if (nearbyProjects.length === 0) return;

    const startLatLng: L.LatLngExpression = [selectedProject.latitude, selectedProject.longitude];

    nearbyProjects.forEach((np) => {
      if (np.latitude && np.longitude && !isNaN(np.latitude) && !isNaN(np.longitude)) {
        const endLatLng: L.LatLngExpression = [np.latitude, np.longitude];
        const line = L.polyline([startLatLng, endLatLng], {
          color: '#06b6d4', // Cyan accent
          weight: 1.5,
          opacity: 0.65,
          dashArray: '4, 6',
        });
        line.addTo(linesLayer);
      }
    });
  }, [selectedProject, nearbyProjects]);

  // 4. Render Decluttered Compact Spatial Clusters (No giant text badges)
  useEffect(() => {
    if (!mapInstanceRef.current || !clustersLayerRef.current) return;
    const layer = clustersLayerRef.current;
    layer.clearLayers();

    if (!showClusters) return;

    clusters.forEach((c) => {
      if (!c.center_lat || !c.center_lon) return;

      const radiusMeters = (c.radius_km || 1.0) * 1000;
      const hasHighPriority = (c.high_priority_count || 0) > 0 || (c.critical_priority_count || 0) > 0;
      const strokeColor = hasHighPriority ? '#f59e0b' : '#3b82f6';
      const fillColor = hasHighPriority ? '#f59e0b' : '#3b82f6';

      // 1. Subtle radius circle showing geographical bounds
      const circle = L.circle([c.center_lat, c.center_lon], {
        radius: radiusMeters,
        color: strokeColor,
        fillColor: fillColor,
        fillOpacity: 0.08,
        weight: 1.2,
        dashArray: '4, 4',
      });

      // 2. Compact circular disc (22px) with project count inside - NO wide labels!
      const centerBadgeHtml = `
        <div class="flex items-center justify-center rounded-full text-white font-bold cursor-pointer transition-transform duration-150 hover:scale-125 shadow-sm" style="
          width: 22px;
          height: 22px;
          background-color: ${hasHighPriority ? '#d97706' : '#2563eb'};
          border: 1.5px solid #ffffff;
          font-size: 10px;
          line-height: 1;
        " title="${c.project_count} projects in ${c.district} cluster">
          ${c.project_count}
        </div>
      `;

      const centerIcon = L.divIcon({
        html: centerBadgeHtml,
        className: 'custom-cluster-circle-badge',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      const centerMarker = L.marker([c.center_lat, c.center_lon], { icon: centerIcon });

      const handleClusterClick = () => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo(
            [c.center_lat, c.center_lon], 
            Math.max(mapInstanceRef.current.getZoom() + 2, 12), 
            { duration: 0.8 }
          );
        }
        onSelectCluster(c);
      };

      circle.on('click', handleClusterClick);
      centerMarker.on('click', handleClusterClick);

      circle.addTo(layer);
      centerMarker.addTo(layer);
    });
  }, [clusters, showClusters, onSelectCluster]);

  // 5. Center on Selected Project when it changes
  const prevFlyToProjectIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedProject) {
      prevFlyToProjectIdRef.current = null;
      return;
    }
    if (prevFlyToProjectIdRef.current === selectedProject.project_id) {
      return;
    }
    prevFlyToProjectIdRef.current = selectedProject.project_id;

    if (
      selectedProject.latitude && 
      selectedProject.longitude && 
      !isNaN(selectedProject.latitude) && 
      !isNaN(selectedProject.longitude) &&
      (Math.abs(selectedProject.latitude) > 0.0001 || Math.abs(selectedProject.longitude) > 0.0001)
    ) {
      mapInstanceRef.current.flyTo(
        [selectedProject.latitude, selectedProject.longitude], 
        14, 
        { duration: 0.8 }
      );
      // Open popup for selected marker reliably in next frame
      requestAnimationFrame(() => {
        const marker = leafletMarkersMap.current.get(selectedProject.project_id);
        if (marker && !marker.isPopupOpen()) {
          marker.openPopup();
        }
      });
    }
  }, [selectedProject]);

  return (
    <div className="relative w-full h-full min-h-[500px] flex-1 bg-background overflow-hidden select-none">
      {/* Real Leaflet Map DOM Canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Canvas Action Controls (Top Right) */}
      <div className="absolute top-3 right-3 flex flex-col gap-1 bg-card/90 backdrop-blur-md rounded-xl p-1 border border-border shadow-md z-10">
        <button
          onClick={() => mapInstanceRef.current?.zoomIn()}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          title="Zoom In (+)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => mapInstanceRef.current?.zoomOut()}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          title="Zoom Out (-)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="w-full h-px bg-border my-0.5" />
        <button
          onClick={() => {
            if (!mapInstanceRef.current || markers.length === 0) return;
            const validMarkers = markers.filter(
              (m) => m.latitude && m.longitude && !isNaN(m.latitude) && !isNaN(m.longitude)
            );
            if (validMarkers.length === 0) return;
            const bounds = L.latLngBounds(validMarkers.map((m) => [m.latitude, m.longitude]));
            mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
          }}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          title="Fit view to visible markers"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            if (!mapInstanceRef.current) return;
            mapInstanceRef.current.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
          }}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          title="Reset view to all India"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Map Legend (Bottom Left) */}
      <div className="absolute bottom-3 left-3 bg-card/90 backdrop-blur-md border border-border rounded-xl p-2.5 shadow-md text-xs space-y-1.5 z-10 max-w-[220px]">
        <div className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
          Map Legend
        </div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-slate-900" />
            <span className="text-foreground">Critical</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-slate-900" />
            <span className="text-foreground">High</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-600 border border-slate-900" />
            <span className="text-foreground">Medium</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-500 border border-slate-900" />
            <span className="text-foreground">Low</span>
          </div>
          {selectedProject && (
            <div className="flex items-center gap-1.5 col-span-2 pt-0.5">
              <span className="w-3 h-3 rounded-full border-2 border-primary bg-primary/20 animate-pulse" />
              <span className="text-primary font-semibold">Selected Project</span>
            </div>
          )}
          {nearbyProjects.length > 0 && (
            <div className="flex items-center gap-1.5 col-span-2">
              <span className="w-3 h-0.5 border-t border-dashed border-cyan-400" />
              <span className="text-cyan-600 dark:text-cyan-400 font-medium">Nearby Trace Link</span>
            </div>
          )}
          {showClusters && (
            <div className="flex items-center gap-1.5 col-span-2">
              <span className="w-3 h-3 rounded-full border border-dashed border-amber-500 bg-amber-500/20" />
              <span className="text-muted-foreground">Spatial Cluster</span>
            </div>
          )}
        </div>
      </div>

      {/* Empty State Overlay when no markers match filters */}
      {markers.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-xs z-20 pointer-events-auto">
          <div className="bg-card border border-border p-6 rounded-2xl shadow-xl max-w-xs text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
              <Filter className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-foreground">No Projects Found</h4>
            <p className="text-xs text-muted-foreground">
              No project locations match the selected filter combination.
            </p>
            {onResetFilters && (
              <button
                onClick={onResetFilters}
                className="px-4 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

GISMapCanvas.displayName = 'GISMapCanvas';

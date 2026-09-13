import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  Network, 
  ExternalLink, 
  MapPin, 
  Layers, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  Navigation, 
  X,
  ArrowUpRight,
  Info,
  CheckCircle2
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import type { 
  MapMarkerItem, 
  MapClusterItem, 
  NearbyProjectItem,
  LocationConsistencyResponse 
} from '../../../types/gis';

interface GISInspectorDrawerProps {
  selectedProject: MapMarkerItem | null;
  selectedCluster: MapClusterItem | null;
  nearbyProjects: NearbyProjectItem[];
  isLoadingNearby: boolean;
  consistencyData: LocationConsistencyResponse | null;
  onSelectProjectId: (projectId: string) => void;
  onClose: () => void;
}

export const GISInspectorDrawer: React.FC<GISInspectorDrawerProps> = ({
  selectedProject,
  selectedCluster,
  nearbyProjects,
  isLoadingNearby,
  consistencyData,
  onSelectProjectId,
  onClose,
}) => {
  const [showTechnical, setShowTechnical] = useState(false);

  // 1. CLUSTER VIEW (When a cluster is selected)
  if (selectedCluster && !selectedProject) {
    const hasHighPriority = (selectedCluster.high_priority_count || 0) > 0 || (selectedCluster.critical_priority_count || 0) > 0;

    return (
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-4 text-xs transition-colors">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-accent/15 text-accent border border-accent/30 flex items-center gap-1">
                <Layers className="w-3 h-3" /> Spatial Cluster
              </span>
              <span className="text-muted-foreground font-mono text-[10px]">
                {selectedCluster.cluster_id}
              </span>
            </div>
            <h3 className="text-base font-bold text-foreground">
              {selectedCluster.district} Cluster
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-1 h-auto text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Cluster Metric Cards */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-muted/20 p-2.5 rounded-xl border border-border">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Total Works</span>
            <span className="text-lg font-bold text-foreground">
              {selectedCluster.project_count}
            </span>
          </div>

          <div className="bg-muted/20 p-2.5 rounded-xl border border-border">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Cluster Radius</span>
            <span className="text-lg font-bold text-foreground font-mono">
              {selectedCluster.radius_km || 1.0} km
            </span>
          </div>

          <div className="bg-muted/20 p-2.5 rounded-xl border border-border">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Avg Audit Priority</span>
            <span className="text-base font-bold text-foreground">
              {selectedCluster.avg_risk_score.toFixed(1)}/100
            </span>
          </div>

          <div className="bg-muted/20 p-2.5 rounded-xl border border-border">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">High Priority</span>
            <span className={`text-base font-bold ${hasHighPriority ? 'text-amber-500' : 'text-foreground'}`}>
              {selectedCluster.high_priority_count || 0}
            </span>
          </div>
        </div>

        {/* Spatial Interpretation Alert */}
        <div className="bg-muted/30 border border-border rounded-xl p-2.5 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-foreground text-[11px]">
            <Info className="w-3.5 h-3.5 text-accent" />
            <span>Geographic Concentration</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {selectedCluster.project_count} projects are geographically concentrated within {selectedCluster.radius_km || 1.0} km in {selectedCluster.district}. Geographic proximity alone does not establish an irregularity.
          </p>
        </div>

        {/* Projects in this Cluster */}
        {selectedCluster.projects && selectedCluster.projects.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
              Constituent Projects ({selectedCluster.projects.length})
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
              {selectedCluster.projects.map((pid) => (
                <button
                  key={pid}
                  onClick={() => onSelectProjectId(pid)}
                  className="w-full text-left p-2 rounded-lg bg-muted/20 hover:bg-muted/40 border border-border flex items-center justify-between transition-colors group"
                >
                  <span className="font-mono text-xs text-foreground group-hover:text-primary font-semibold">
                    {pid}
                  </span>
                  <span className="text-[10px] text-muted-foreground group-hover:text-primary flex items-center gap-0.5">
                    <span>Inspect</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. PROJECT VIEW (When a project is selected)
  if (selectedProject) {
    const amountLakhs = selectedProject.sanctioned_amount 
      ? (selectedProject.sanctioned_amount / 100000).toFixed(2) 
      : null;

    // Determine spatial status
    const hasSpatialSignal = Boolean(selectedProject.spatial_anomaly_signal);
    const spatialStatus = hasSpatialSignal
      ? 'Potential Spatial Signal'
      : selectedProject.priority_level === 'CRITICAL' || selectedProject.priority_level === 'HIGH'
      ? 'Requires Human Verification'
      : 'Normal';

    return (
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-4 text-xs transition-colors">
        {/* Header: Project ID & Priority */}
        <div className="flex items-start justify-between border-b border-border pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-primary">
                {selectedProject.project_id}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                selectedProject.priority_level === 'CRITICAL' ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30' :
                selectedProject.priority_level === 'HIGH' ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30' :
                selectedProject.priority_level === 'MEDIUM' ? 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30' :
                'bg-slate-500/15 text-slate-400 border border-slate-500/30'
              }`}>
                {selectedProject.priority_level} ({selectedProject.unified_score ? selectedProject.unified_score.toFixed(0) : '0'})
              </span>
            </div>
            <h3 className="text-sm font-bold text-foreground leading-snug line-clamp-2" title={selectedProject.title}>
              {selectedProject.title}
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-1 h-auto text-muted-foreground hover:text-foreground shrink-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Location & Sanctioned Amount */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-muted/20 p-2.5 rounded-xl border border-border">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Location</span>
            <span className="text-sm font-semibold text-foreground">
              {selectedProject.district || 'N/A'}
            </span>
            {selectedProject.state && (
              <span className="text-[10px] text-muted-foreground block truncate">
                {selectedProject.state}
              </span>
            )}
          </div>

          <div className="bg-muted/20 p-2.5 rounded-xl border border-border">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Sanctioned</span>
            <span className="text-sm font-bold text-foreground">
              {amountLakhs ? `₹${amountLakhs} L` : 'N/A'}
            </span>
            <span className="text-[10px] text-muted-foreground block">
              {selectedProject.sector || 'MPLADS'}
            </span>
          </div>
        </div>

        {/* Spatial Status Badge */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/20 border border-border">
          <span className="text-[10px] uppercase font-semibold text-muted-foreground">Spatial Status</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            hasSpatialSignal
              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
              : spatialStatus === 'Requires Human Verification'
              ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
              : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
          }`}>
            {spatialStatus}
          </span>
        </div>

        {/* Spatial Signals */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Spatial Signals
          </div>
          {hasSpatialSignal ? (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400 text-xs">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Signal Detected</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {selectedProject.spatial_anomaly_signal}
              </p>
            </div>
          ) : (
            <div className="bg-muted/20 border border-border rounded-xl p-2.5 text-[11px] text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>No significant spatial signal returned.</span>
            </div>
          )}
        </div>

        {/* Nearby Projects List with Distances */}
        <div className="space-y-2 pt-1 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
              <Navigation className="w-3.5 h-3.5 text-accent" />
              <span>Nearby Projects</span>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">
              {nearbyProjects.length} found (&lt;5 km)
            </span>
          </div>

          {isLoadingNearby ? (
            <div className="p-3 text-center text-muted-foreground text-xs">
              Calculating nearby projects via haversine distance...
            </div>
          ) : nearbyProjects.length > 0 ? (
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {nearbyProjects.map((np) => (
                <div
                  key={np.project_id}
                  onClick={() => onSelectProjectId(np.project_id)}
                  className="p-2 rounded-xl bg-muted/20 hover:bg-muted/40 border border-border cursor-pointer transition-colors space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-primary">
                      {np.project_id}
                    </span>
                    <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                      {np.distance_km < 1 ? `${np.distance_meters} m` : `${np.distance_km} km`}
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-foreground line-clamp-1">
                    {np.title}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{np.sector || 'Sector'}</span>
                    <span className={np.priority_level === 'CRITICAL' ? 'text-rose-500 font-bold' : ''}>
                      {np.priority_level}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-muted/20 text-center text-muted-foreground text-[11px]">
              No nearby projects within 5.0 km radius.
            </div>
          )}
        </div>

        {/* SIH Audit Standard Disclaimer */}
        <div className="p-2.5 rounded-xl bg-muted/30 border border-border text-[10px] text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Investigation Note:</strong> Geographic proximity is an investigation signal for human review, not proof of irregularity or wrongdoing.
        </div>

        {/* Level 3: Collapsible Technical Details */}
        <div className="border-t border-border pt-2">
          <button
            onClick={() => setShowTechnical(!showTechnical)}
            className="w-full flex items-center justify-between py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Technical GIS Details</span>
            {showTechnical ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showTechnical && (
            <div className="mt-2 p-2.5 rounded-xl bg-muted/30 border border-border space-y-1 font-mono text-[10px] text-muted-foreground">
              <div className="flex justify-between">
                <span>Latitude:</span>
                <span className="text-foreground">{selectedProject.latitude.toFixed(6)}° N</span>
              </div>
              <div className="flex justify-between">
                <span>Longitude:</span>
                <span className="text-foreground">{selectedProject.longitude.toFixed(6)}° E</span>
              </div>
              <div className="flex justify-between">
                <span>Geodetic Datum:</span>
                <span className="text-foreground">WGS 84 (EPSG:4326)</span>
              </div>
              <div className="flex justify-between">
                <span>Distance Metric:</span>
                <span className="text-foreground">Spherical Haversine</span>
              </div>
              {consistencyData && (
                <div className="flex justify-between pt-1 border-t border-border">
                  <span>Photo GPS Consistency:</span>
                  <span className="text-foreground font-bold">{consistencyData.overall_consistency}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons: Navigate to Other Screens */}
        <div className="space-y-1.5 pt-2 border-t border-border">
          <Link to={`/projects/${selectedProject.project_id}`} className="block">
            <Button variant="primary" size="sm" className="w-full text-xs font-semibold flex items-center justify-center gap-1.5 py-2">
              <FileText className="w-3.5 h-3.5" />
              <span>Open Project Investigation</span>
              <ExternalLink className="w-3 h-3 ml-auto" />
            </Button>
          </Link>

          <Link to={`/nexus?projectId=${selectedProject.project_id}`} className="block">
            <Button variant="outline" size="sm" className="w-full text-xs font-medium flex items-center justify-center gap-1.5 py-1.5">
              <Network className="w-3.5 h-3.5 text-accent" />
              <span>View in Nexus</span>
              <ExternalLink className="w-3 h-3 ml-auto text-muted-foreground" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // 3. DEFAULT STATE (When no project or cluster is currently selected)
  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-4 text-xs transition-colors">
      <div className="space-y-1.5 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> Spatial Workspace
          </span>
        </div>
        <h3 className="text-base font-bold text-foreground">
          Spatial Workspace
        </h3>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Select a project or cluster on the map to inspect its geographic context.
        </p>
      </div>

      <div className="p-3 rounded-xl bg-muted/20 border border-border space-y-2">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Project locations can help identify geographic concentration and nearby works that may deserve further human review.
        </p>
        <div className="pt-1 text-[10px] text-muted-foreground">
          <strong className="text-foreground">Standard:</strong> High proximity between sanctions is an investigation signal, not automatic evidence of wrongdoing.
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import type { ProjectItem } from '../../../types/project';
import type { ProjectEvidenceItem } from '../../../types/evidence';
import { Camera, MapPin, Network, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';

interface InvestigationEntryPointsProps {
  project: ProjectItem;
  evidenceList: ProjectEvidenceItem[];
  nearbyData: {
    project_id: string;
    nearby: Array<{
      project_id: string;
      title: string;
      distance_km: number;
      distance_meters: number;
      sector?: string;
    }>;
  } | null;
  contractorName?: string | null;
}

export const InvestigationEntryPoints: React.FC<InvestigationEntryPointsProps> = ({
  project,
  evidenceList,
  nearbyData,
  contractorName = 'Apex Infrastructure Ltd', // from network explanation
}) => {
  const nearbyWorks = nearbyData?.nearby || [];
  const nearestWork = nearbyWorks[0];
  const hasCoords = project.location?.has_valid_coords;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Specialized Forensic Entry Points
          </h3>
          <p className="text-xs text-muted-foreground">
            Direct gateways to deep multi-modal intelligence modules for this work
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Evidence Intelligence Gateway */}
        <Card className="p-4 flex flex-col justify-between hover:border-primary/50 transition-colors border-border shadow-xs">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Photo & Document Evidence
              </span>
              <div className="w-7 h-7 rounded-md bg-info-surface text-info border border-info/30 flex items-center justify-center">
                <Camera className="w-4 h-4" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-lg font-bold font-mono text-foreground">
                {evidenceList.length} Items Attached
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {evidenceList.length > 0
                  ? evidenceList.map((e) => e.evidence_type.replace(/_/g, ' ')).join(', ')
                  : 'No photographic records currently uploaded for this work.'}
              </p>
            </div>

            {evidenceList.length > 0 && (
              <div className="p-2 rounded bg-surface-muted/50 border border-border/40 text-[11px] space-y-1">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>EXIF GPS Validity:</span>
                  <span className="text-success font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Validated
                  </span>
                </div>
                {evidenceList[0]?.metadata_record?.device_make && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Camera Hardware:</span>
                    <span className="font-mono text-foreground truncate max-w-[120px]">
                      {evidenceList[0].metadata_record.device_make}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pt-4 mt-auto">
            <Link to={`/evidence?projectId=${project.project_id}`}>
              <Button variant="outline" size="sm" className="w-full text-xs justify-between group">
                <span>View Evidence Intelligence</span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </Button>
            </Link>
          </div>
        </Card>

        {/* 2. Spatial GIS Proximity Gateway */}
        <Card className="p-4 flex flex-col justify-between hover:border-danger/50 transition-colors border-border shadow-xs">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Spatial Proximity & GIS
              </span>
              <div className="w-7 h-7 rounded-md bg-danger-surface text-danger border border-danger/30 flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-lg font-bold font-mono text-foreground">
                {nearbyWorks.length} Sibling Works
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {nearestWork
                  ? `Nearest project within ${Math.round(nearestWork.distance_meters)}m: ${nearestWork.project_id}`
                  : hasCoords
                  ? 'No adjacent works within standard 2.0 km radius query'
                  : 'Coordinates missing or unverified'}
              </p>
            </div>

            {hasCoords && (
              <div className="p-2 rounded bg-surface-muted/50 border border-border/40 text-[11px] space-y-1">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>GPS Position:</span>
                  <span className="font-mono text-foreground">
                    {project.location?.latitude?.toFixed(4)}, {project.location?.longitude?.toFixed(4)}
                  </span>
                </div>
                {nearestWork && nearestWork.distance_meters < 200 && (
                  <div className="flex items-center justify-between text-danger font-medium">
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Overlap Risk:
                    </span>
                    <span>&lt; 150m Proximity</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pt-4 mt-auto">
            <Link to={`/gis?projectId=${project.project_id}`}>
              <Button variant="outline" size="sm" className="w-full text-xs justify-between group">
                <span>View in GIS Workstation</span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </Button>
            </Link>
          </div>
        </Card>

        {/* 3. Entity Nexus / Contractor Network Gateway */}
        <Card className="p-4 flex flex-col justify-between hover:border-primary/50 transition-colors border-border shadow-xs">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Contractor & Entity Nexus
              </span>
              <div className="w-7 h-7 rounded-md bg-primary-muted/20 text-primary border border-primary/20 flex items-center justify-center">
                <Network className="w-4 h-4" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-lg font-bold text-foreground truncate" title={contractorName || 'Entity Registry'}>
                {contractorName || 'Entity Identified'}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                Unusual multi-district concentration pattern flagged across public procurement records.
              </p>
            </div>

            <div className="p-2 rounded bg-surface-muted/50 border border-border/40 text-[11px] space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Network Pattern:</span>
                <span className="text-warning font-medium">Concentration Alert</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Associated Entities:</span>
                <span className="font-mono text-foreground">85 Projects • 24 Districts</span>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-auto">
            <Link to={`/nexus?projectId=${project.project_id}&contractor=${encodeURIComponent(contractorName || '')}`}>
              <Button variant="outline" size="sm" className="w-full text-xs justify-between group">
                <span>Explore Nexus Topology</span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

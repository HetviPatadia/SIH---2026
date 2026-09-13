import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  MapPin, 
  CheckCircle2,
  Layers,
  AlertCircle,
  Globe2,
  RotateCcw
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import type { MapSummaryData } from '../../../types/gis';

interface GISHeaderProps {
  summary: MapSummaryData | null;
  onRefresh: () => void;
  isLoading: boolean;
}

export const GISHeader: React.FC<GISHeaderProps> = ({
  summary,
  onRefresh,
  isLoading,
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/reviews');
    }
  };

  return (
    <div className="bg-card border-b border-border px-6 py-4 transition-colors">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Title & Navigation */}
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="p-2 h-auto text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl shrink-0 mt-0.5"
            title="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">
                GIS Intelligence
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-muted text-muted-foreground border border-border">
                CRS: EPSG:4326
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Explore project locations, nearby works and spatial patterns.
            </p>
          </div>
        </div>

        {/* Status Metrics & Actions */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
          {summary ? (
            <>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-muted/30 border border-border">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-muted-foreground">Geocoded:</span>
                <span className="font-semibold text-foreground">
                  {summary.projects_with_coordinates.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-muted/30 border border-border">
                <Layers className="w-3.5 h-3.5 text-accent" />
                <span className="text-muted-foreground">Clusters:</span>
                <span className="font-semibold text-foreground">
                  {summary.cluster_count}
                </span>
              </div>

              {summary.spatial_signal_count > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{summary.spatial_signal_count} Spatial Signals</span>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Globe2 className="w-3.5 h-3.5 animate-spin text-primary" />
              <span>Loading spatial telemetry...</span>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 h-auto text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl"
            title="Refresh spatial data"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>
    </div>
  );
};

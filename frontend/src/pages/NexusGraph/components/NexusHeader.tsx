import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Network, 
  RotateCcw, 
  Building2, 
  FileText, 
  MapPin,
  X 
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';

interface NexusHeaderProps {
  selectedContractorName?: string | null;
  selectedProjectId?: string | null;
  selectedCityName?: string | null;
  onClearContractor: () => void;
  onClearSubSelection: () => void;
  projectCount: number;
  cityCount: number;
  onResetGraph: () => void;
}

export const NexusHeader: React.FC<NexusHeaderProps> = ({
  selectedContractorName,
  selectedProjectId,
  selectedCityName,
  onClearContractor,
  onClearSubSelection,
  projectCount,
  cityCount,
  onResetGraph,
}) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-3 pb-2 border-b border-border">
      {/* Top Navigation Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors py-1 px-2.5 rounded-lg hover:bg-muted"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
          <span className="text-muted-foreground/40 hidden sm:inline">|</span>

          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
            <Network className="w-3 h-3" />
            <span>CONTRACTOR NEXUS TOPOLOGY</span>
          </div>

          {/* Active Contractor Chip */}
          {selectedContractorName && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/30">
              <Building2 className="w-3 h-3 text-amber-500" />
              <span className="truncate max-w-[160px] sm:max-w-[220px]" title={selectedContractorName}>
                {selectedContractorName}
              </span>
              <button
                onClick={onClearContractor}
                className="hover:text-foreground ml-0.5 p-0.5 rounded"
                title="Change contractor"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Active Project Chip */}
          {selectedProjectId && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/30">
              <FileText className="w-3 h-3 text-blue-500" />
              <span>Project: {selectedProjectId}</span>
              <button
                onClick={onClearSubSelection}
                className="hover:text-foreground ml-0.5 p-0.5 rounded"
                title="Clear project selection"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Active City Chip */}
          {selectedCityName && !selectedProjectId && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
              <MapPin className="w-3 h-3 text-emerald-500" />
              <span>City: {selectedCityName}</span>
              <button
                onClick={onClearSubSelection}
                className="hover:text-foreground ml-0.5 p-0.5 rounded"
                title="Clear city selection"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {selectedContractorName && (
          <div className="flex items-center gap-2">
            <div className="text-[11px] font-mono text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-lg border border-border flex items-center gap-1.5">
              <span>{projectCount} Projects</span>
              <span className="opacity-40">•</span>
              <span>{cityCount} Cities</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={onResetGraph}
              className="text-xs flex items-center gap-1"
              title="Reset graph positions"
            >
              <RotateCcw className="w-3 h-3 text-muted-foreground" />
              <span className="hidden sm:inline">Reset Graph</span>
            </Button>
          </div>
        )}
      </div>

      {/* Main Title & Subtitle */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <span>Nexus Graph Intelligence</span>
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground mt-0.5 max-w-3xl">
          Explore relationships between contractors, projects, and execution cities.
        </p>
      </div>
    </div>
  );
};

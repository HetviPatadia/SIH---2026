import React from 'react';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Search, X, RotateCcw, Filter, AlertTriangle, Layers } from 'lucide-react';

export interface EvidenceFilters {
  search: string;
  projectId?: string;
  evidenceType: string;
  status: string;
  hasSimilaritySignal: boolean;
  hasLocationSignal: boolean;
  hasTemporalSignal: boolean;
}

interface EvidenceFilterBarProps {
  filters: EvidenceFilters;
  onFilterChange: (newFilters: Partial<EvidenceFilters>) => void;
  onReset: () => void;
  totalResults: number;
}

export const EvidenceFilterBar: React.FC<EvidenceFilterBarProps> = ({
  filters,
  onFilterChange,
  onReset,
  totalResults,
}) => {
  const hasActiveFilters =
    Boolean(filters.search) ||
    Boolean(filters.projectId) ||
    Boolean(filters.evidenceType) ||
    Boolean(filters.status) ||
    filters.hasSimilaritySignal ||
    filters.hasLocationSignal ||
    filters.hasTemporalSignal;

  return (
    <div className="space-y-2.5">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-lg border border-border bg-surface-elevated/60">
        {/* Search Input */}
        <div className="w-full md:w-80">
          <Input
            placeholder="Search evidence ID, project ID, title, district..."
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            leftIcon={<Search className="w-4 h-4 text-muted-foreground" />}
            className="h-9 text-xs bg-surface"
          />
        </div>

        {/* Filter Dropdowns & Signal Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Evidence Type */}
          <select
            value={filters.evidenceType}
            onChange={(e) => onFilterChange({ evidenceType: e.target.value })}
            className="h-9 px-2.5 py-1 text-xs rounded-md border border-border bg-surface text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            aria-label="Evidence Type"
          >
            <option value="">All Evidence Types</option>
            <option value="COMPLETION_PHOTO">Completion Photo</option>
            <option value="PROGRESS_PHOTO">Progress Photo</option>
            <option value="DOCUMENT">Document</option>
            <option value="INSPECTION_PHOTO">Inspection Photo</option>
          </select>

          {/* Verification Status */}
          <select
            value={filters.status}
            onChange={(e) => onFilterChange({ status: e.target.value })}
            className="h-9 px-2.5 py-1 text-xs rounded-md border border-border bg-surface text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            aria-label="Evidence Status"
          >
            <option value="">All Verification States</option>
            <option value="VERIFIED">Verified (Consistent)</option>
            <option value="POTENTIAL_REUSE">Potential Reuse</option>
            <option value="LOCATION_INCONSISTENCY">Location Inconsistent</option>
            <option value="TEMPORAL_INCONSISTENCY">Temporal Inconsistent</option>
            <option value="INSUFFICIENT_METADATA">Insufficient Metadata</option>
            <option value="REVIEW_REQUIRED">Requires Verification</option>
            <option value="UNAVAILABLE">Unavailable</option>
          </select>

          {/* Quick Signal Pill Buttons */}
          <button
            type="button"
            onClick={() =>
              onFilterChange({
                hasSimilaritySignal: !filters.hasSimilaritySignal,
              })
            }
            className={`h-9 px-2.5 rounded-md text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              filters.hasSimilaritySignal
                ? 'bg-warning/20 text-warning border-warning/40 shadow-xs'
                : 'bg-surface text-muted-foreground border-border hover:text-foreground hover:bg-surface-muted/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Reuse Signal</span>
          </button>

          <button
            type="button"
            onClick={() =>
              onFilterChange({
                hasLocationSignal: !filters.hasLocationSignal,
              })
            }
            className={`h-9 px-2.5 rounded-md text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              filters.hasLocationSignal
                ? 'bg-danger/20 text-danger border-danger/40 shadow-xs'
                : 'bg-surface text-muted-foreground border-border hover:text-foreground hover:bg-surface-muted/50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Location Delta</span>
          </button>

          {/* Reset Action */}
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              className="h-9 text-xs"
            >
              Reset
            </Button>
          )}
        </div>

        {/* Records Count */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Filter className="w-3.5 h-3.5 text-primary" />
          <span>
            Showing <strong className="font-mono text-foreground">{totalResults.toLocaleString()}</strong> records
          </span>
        </div>
      </div>

      {/* Active Filter Badges */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5 px-1">
          <span className="text-[11px] text-muted-foreground uppercase font-medium mr-1">
            Active Filters:
          </span>

          {filters.search && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-muted text-foreground border border-border text-[11px]">
              Query: &quot;{filters.search}&quot;
              <button
                onClick={() => onFilterChange({ search: '' })}
                className="hover:text-danger ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.projectId && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/30 text-[11px] font-mono font-medium">
              Project: {filters.projectId}
              <button
                onClick={() => onFilterChange({ projectId: undefined })}
                className="hover:text-danger ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.evidenceType && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-muted text-foreground border border-border text-[11px]">
              Type: {filters.evidenceType.replace(/_/g, ' ')}
              <button
                onClick={() => onFilterChange({ evidenceType: '' })}
                className="hover:text-danger ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.status && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-muted text-foreground border border-border text-[11px]">
              Status: {filters.status.replace(/_/g, ' ')}
              <button
                onClick={() => onFilterChange({ status: '' })}
                className="hover:text-danger ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.hasSimilaritySignal && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-warning/15 text-warning border border-warning/30 text-[11px]">
              <Layers className="w-3 h-3" />
              Potential Reuse Signal
              <button
                onClick={() => onFilterChange({ hasSimilaritySignal: false })}
                className="hover:text-danger ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.hasLocationSignal && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-danger/15 text-danger border border-danger/30 text-[11px]">
              <AlertTriangle className="w-3 h-3" />
              Location Inconsistency
              <button
                onClick={() => onFilterChange({ hasLocationSignal: false })}
                className="hover:text-danger ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          <button
            onClick={onReset}
            className="text-[11px] text-muted-foreground hover:text-foreground underline ml-1 cursor-pointer"
          >
            Clear All
          </button>
        </div>
      )}
    </div>
  );
};

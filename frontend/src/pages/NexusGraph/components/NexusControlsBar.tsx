import React, { useState } from 'react';
import { 
  Search, 
  Layers, 
  ShieldAlert, 
  X,
  Loader2
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import type { GraphQueryParams } from '../../../types/network';

interface NexusControlsBarProps {
  queryParams: GraphQueryParams;
  onFilterChange: (newParams: Partial<GraphQueryParams>) => void;
  onResetFilters: () => void;
  isLoading: boolean;
}

export const NexusControlsBar: React.FC<NexusControlsBarProps> = ({
  queryParams,
  onFilterChange,
  onResetFilters,
  isLoading,
}) => {
  const [searchTerm, setSearchTerm] = useState(
    queryParams.project_id || queryParams.contractor || ''
  );

  // Sync internal search when props change
  React.useEffect(() => {
    setSearchTerm(queryParams.project_id || queryParams.contractor || '');
  }, [queryParams.project_id, queryParams.contractor]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const term = searchTerm.trim();
    if (!term) {
      onFilterChange({ project_id: undefined, contractor: undefined });
      return;
    }

    // If starts with MPL or contains numbers, treat as project_id; else contractor
    if (term.toUpperCase().startsWith('MPL') || term.toUpperCase().startsWith('PROJ')) {
      onFilterChange({ project_id: term, contractor: undefined });
    } else {
      onFilterChange({ contractor: term, project_id: undefined });
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    onFilterChange({ project_id: undefined, contractor: undefined });
  };

  const hasActiveFilters = Boolean(
    queryParams.project_id ||
    queryParams.contractor ||
    queryParams.district ||
    queryParams.node_type ||
    queryParams.priority ||
    (queryParams.depth && queryParams.depth > 1)
  );

  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-xs space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Search by Project ID or Contractor */}
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[260px] relative">
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-primary animate-spin pointer-events-none" />
          ) : (
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          )}
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search project ID (e.g. MPL-00001) or contractor name..."
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/60 transition-colors"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </form>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Entity Type Filter */}
          <div className="flex items-center gap-1.5 bg-background border border-input rounded-lg px-2.5 py-1 text-xs text-muted-foreground">
            <Layers className="w-3 h-3 text-muted-foreground shrink-0" />
            <select
              value={queryParams.node_type || ''}
              onChange={(e) => onFilterChange({ node_type: e.target.value || undefined })}
              className="bg-transparent border-none text-xs text-foreground focus:outline-none cursor-pointer"
            >
              <option value="">All Entity Types</option>
              <option value="PROJECT">Projects Only</option>
              <option value="CONTRACTOR">Contractors Only</option>
              <option value="DISTRICT">Districts Only</option>
              <option value="EVIDENCE">Evidence Only</option>
            </select>
          </div>

          {/* Audit Priority Level Filter */}
          <div className="flex items-center gap-1.5 bg-background border border-input rounded-lg px-2.5 py-1 text-xs text-muted-foreground">
            <ShieldAlert className="w-3 h-3 text-muted-foreground shrink-0" />
            <select
              value={queryParams.priority || ''}
              onChange={(e) => onFilterChange({ priority: e.target.value || undefined })}
              className="bg-transparent border-none text-xs text-foreground focus:outline-none cursor-pointer"
            >
              <option value="">All Priorities</option>
              <option value="HIGH,CRITICAL">High & Critical Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="LOW">Low Priority</option>
            </select>
          </div>

          {/* Depth / Neighborhood Scope */}
          <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border text-xs">
            <button
              type="button"
              onClick={() => onFilterChange({ depth: 1 })}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                queryParams.depth === 1 || !queryParams.depth
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="1-hop: direct links to selected entity"
            >
              1-Hop Direct
            </button>
            <button
              type="button"
              onClick={() => onFilterChange({ depth: 2 })}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                queryParams.depth === 2
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="2-hop: extended neighborhood / cross-project connections"
            >
              2-Hop Extended
            </button>
          </div>

          {/* Limit selector */}
          <div className="flex items-center gap-1 bg-background border border-input rounded-lg px-2 py-1 text-xs text-muted-foreground">
            <span className="text-[11px]">Limit:</span>
            <select
              value={queryParams.limit || 100}
              onChange={(e) => onFilterChange({ limit: Number(e.target.value) })}
              className="bg-transparent border-none text-xs text-foreground focus:outline-none cursor-pointer font-mono"
            >
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
            </select>
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetFilters}
              className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
              title="Clear all active filters"
            >
              <span>Clear</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

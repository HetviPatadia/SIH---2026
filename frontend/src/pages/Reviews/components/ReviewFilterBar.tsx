import React from 'react';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';
import { Search, X, RotateCcw, Filter } from 'lucide-react';

export interface ReviewFilters {
  search: string;
  priority: string;
  reviewStatus: string;
  sortBy: string;
  sortOrder: string;
}

interface ReviewFilterBarProps {
  filters: ReviewFilters;
  onFilterChange: (key: keyof ReviewFilters, value: string) => void;
  onReset: () => void;
  totalResults: number;
}

export const ReviewFilterBar: React.FC<ReviewFilterBarProps> = ({
  filters,
  onFilterChange,
  onReset,
  totalResults,
}) => {
  const isFiltered =
    Boolean(filters.search) ||
    Boolean(filters.priority) ||
    Boolean(filters.reviewStatus) ||
    filters.sortBy !== 'audit_priority';

  return (
    <div className="rounded-lg border border-border bg-surface p-3.5 space-y-3 shadow-xs">
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search input */}
        <div className="flex-1 relative">
          <Input
            placeholder="Search by Project ID, title, district, or contractor..."
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
            rightIcon={
              filters.search ? (
                <button
                  type="button"
                  onClick={() => onFilterChange('search', '')}
                  className="hover:text-foreground p-0.5 rounded focus:outline-none"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : undefined
            }
            className="text-xs"
          />
        </div>

        {/* Priority Filter */}
        <div className="w-full md:w-44 shrink-0">
          <Select
            value={filters.priority}
            onChange={(e) => onFilterChange('priority', e.target.value)}
            className="text-xs"
          >
            <option value="">All Priorities</option>
            <option value="CRITICAL">High-Priority Review (Critical)</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="LOW">Low Priority</option>
          </Select>
        </div>

        {/* Review Status Filter */}
        <div className="w-full md:w-44 shrink-0">
          <Select
            value={filters.reviewStatus}
            onChange={(e) => onFilterChange('reviewStatus', e.target.value)}
            className="text-xs"
          >
            <option value="">All Review Statuses</option>
            <option value="NEW">New</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="VERIFICATION_REQUIRED">Verification Required</option>
            <option value="ESCALATED">Escalated</option>
            <option value="VERIFIED">Verified</option>
            <option value="DISMISSED">Dismissed</option>
            <option value="CLOSED">Closed</option>
          </Select>
        </div>

        {/* Sort By */}
        <div className="w-full md:w-44 shrink-0">
          <Select
            value={`${filters.sortBy}:${filters.sortOrder}`}
            onChange={(e) => {
              const [by, ord] = e.target.value.split(':');
              onFilterChange('sortBy', by);
              onFilterChange('sortOrder', ord);
            }}
            className="text-xs"
          >
            <option value="audit_priority:desc">Highest Priority First</option>
            <option value="audit_priority:asc">Lowest Priority First</option>
            <option value="updated_at:desc">Recently Updated</option>
            <option value="project_id:asc">Project ID (A-Z)</option>
          </Select>
        </div>

        {/* Reset button if filtered */}
        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            className="text-xs text-muted-foreground hover:text-foreground shrink-0 self-center"
          >
            Reset
          </Button>
        )}
      </div>

      {/* Active Filter Tags & Count */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <Filter className="w-3 h-3 text-muted-foreground" />
          <span>
            Found <strong className="text-foreground font-mono">{totalResults.toLocaleString()}</strong> works matching criteria
          </span>
        </div>

        {isFiltered && (
          <div className="flex flex-wrap items-center gap-1.5">
            {filters.priority && (
              <span className="px-2 py-0.5 rounded-md bg-surface-muted border border-border text-[10px] text-foreground">
                Priority: <strong className="uppercase">{filters.priority}</strong>
              </span>
            )}
            {filters.reviewStatus && (
              <span className="px-2 py-0.5 rounded-md bg-surface-muted border border-border text-[10px] text-foreground">
                Status: <strong className="uppercase">{filters.reviewStatus}</strong>
              </span>
            )}
            {filters.search && (
              <span className="px-2 py-0.5 rounded-md bg-surface-muted border border-border text-[10px] text-foreground">
                Query: &quot;{filters.search}&quot;
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

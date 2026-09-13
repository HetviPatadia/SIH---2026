import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Search, 
  X, 
  RotateCcw, 
  Maximize2, 
  Layers, 
  ChevronDown
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import type { GISFilterState, MapMarkerItem } from '../../../types/gis';

interface GISFiltersBarProps {
  filters: GISFilterState;
  onFilterChange: (newFilters: Partial<GISFilterState>) => void;
  onResetFilters: () => void;
  onFitProjects: () => void;
  onResetView: () => void;
  availableDistricts: string[];
  availableStates: string[];
  availableSectors: string[];
  totalVisibleCount: number;
  markers?: MapMarkerItem[];
  onSelectProjectId?: (projectId: string) => void;
}

export const GISFiltersBar: React.FC<GISFiltersBarProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  onFitProjects,
  onResetView,
  availableDistricts,
  availableStates,
  availableSectors,
  totalVisibleCount,
  markers = [],
  onSelectProjectId,
}) => {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);

  // Calculate dropdown position anchored to the search input (fixed positioning to escape overflow:hidden)
  const updateDropdownPos = () => {
    if (searchInputRef.current) {
      const rect = searchInputRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 320),
      });
    }
  };

  // Close search suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update position when window resizes or scrolls
  useEffect(() => {
    if (!isSearchFocused) return;
    const update = () => updateDropdownPos();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [isSearchFocused]);

  // Filter query matches for search autocomplete suggestions (up to 5 items)
  const searchSuggestions = useMemo(() => {
    const query = filters.searchQuery.trim().toLowerCase();
    if (!query || query.length < 2 || !markers.length) return [];
    return markers
      .filter((m) => {
        const idMatch = (m.project_id || '').toLowerCase().includes(query);
        const titleMatch = (m.title || '').toLowerCase().includes(query);
        const distMatch = (m.district || '').toLowerCase().includes(query);
        const stateMatch = (m.state || '').toLowerCase().includes(query);
        return idMatch || titleMatch || distMatch || stateMatch;
      })
      .slice(0, 5);
  }, [filters.searchQuery, markers]);

  const showSuggestions = isSearchFocused && searchSuggestions.length > 0;

  // Determine whether any filter is currently applied
  const hasActiveFilters = Boolean(
    filters.searchQuery || 
    filters.state || 
    filters.district || 
    filters.sector || 
    (filters.priority && filters.priority !== 'ALL')
  );

  return (
    // Bar itself is in normal document flow. No overflow:hidden. No z-index.
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-2 transition-colors">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        
        {/* ======================== PRIMARY FILTERS (LEFT) ======================== */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* 1. Search Box â€” autocomplete via fixed portal */}
          <div ref={searchContainerRef} className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search Project / Title..."
              value={filters.searchQuery}
              onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
              onFocus={() => {
                setIsSearchFocused(true);
                updateDropdownPos();
              }}
              className="w-48 sm:w-60 h-9 pl-8 pr-7 text-xs bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all"
            />
            {filters.searchQuery && (
              <button
                type="button"
                onClick={() => onFilterChange({ searchQuery: '' })}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}

            {/* Autocomplete Dropdown â€” fixed position to escape any overflow:hidden parent */}
            {showSuggestions && dropdownPos && (
              <div
                style={{
                  position: 'fixed',
                  top: dropdownPos.top,
                  left: dropdownPos.left,
                  width: dropdownPos.width,
                  zIndex: 9999,
                }}
                className="max-h-64 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 divide-y divide-slate-100 dark:divide-slate-800"
              >
                <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                  Matching Geocoded Works
                </div>
                {searchSuggestions.map((item) => (
                  <button
                    key={item.project_id}
                    type="button"
                    onMouseDown={() => {
                      if (onSelectProjectId) onSelectProjectId(item.project_id);
                      onFilterChange({ searchQuery: item.project_id });
                      setIsSearchFocused(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors flex flex-col gap-0.5 cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs">
                        {item.project_id}
                      </span>
                      <span className={`text-[10px] font-semibold px-1.5 rounded border ${
                        item.priority_level === 'CRITICAL'
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                          : item.priority_level === 'HIGH'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      }`}>
                        {item.priority_level} ({Math.round(item.unified_score || 0)})
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-slate-700 dark:text-slate-200 line-clamp-1">
                      {item.title}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {item.district || 'Unknown District'}{item.state ? `, ${item.state}` : ''}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. State Dropdown */}
          <div className="relative flex items-center h-9 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 focus-within:border-blue-500 dark:focus-within:border-blue-400 rounded-lg transition-all">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 pl-2.5 pr-1 select-none pointer-events-none whitespace-nowrap">
              State
            </span>
            <select
              value={filters.state}
              onChange={(e) => onFilterChange({ state: e.target.value })}
              className="appearance-none bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-100 pl-1 pr-6 h-full cursor-pointer outline-none max-w-[130px]"
              title="Filter by state"
            >
              <option value="" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">
                All ({availableStates.length})
              </option>
              {availableStates.map((st) => (
                <option key={st} value={st} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">
                  {st}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2" />
          </div>

          {/* 3. District Dropdown */}
          <div className="relative flex items-center h-9 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 focus-within:border-blue-500 dark:focus-within:border-blue-400 rounded-lg transition-all">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 pl-2.5 pr-1 select-none pointer-events-none whitespace-nowrap">
              District
            </span>
            <select
              value={filters.district}
              onChange={(e) => onFilterChange({ district: e.target.value })}
              className="appearance-none bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-100 pl-1 pr-6 h-full cursor-pointer outline-none max-w-[130px]"
              title={filters.state ? `Districts in ${filters.state}` : 'Filter by district'}
            >
              <option value="" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">
                {filters.state ? `All in ${filters.state}` : `All (${availableDistricts.length})`}
              </option>
              {availableDistricts.map((dist) => (
                <option key={dist} value={dist} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">
                  {dist}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2" />
          </div>

          {/* 4. Priority Dropdown */}
          <div className="relative flex items-center h-9 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 focus-within:border-blue-500 dark:focus-within:border-blue-400 rounded-lg transition-all">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 pl-2.5 pr-1 select-none pointer-events-none whitespace-nowrap">
              Priority
            </span>
            <select
              value={filters.priority}
              onChange={(e) => onFilterChange({ priority: e.target.value })}
              className="appearance-none bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-100 pl-1 pr-6 h-full cursor-pointer outline-none max-w-[145px]"
              title="Filter by risk priority level"
            >
              <option value="ALL" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">All Priorities</option>
              <option value="CRITICAL" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">Critical (≥ 85)</option>
              <option value="HIGH,CRITICAL" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">High + Critical (≥ 70)</option>
              <option value="HIGH" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">High (70 - 84)</option>
              <option value="MEDIUM" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">Medium (30 - 69)</option>
              <option value="LOW" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">Low (&lt; 30)</option>
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2" />
          </div>

          {/* 5. Sector Dropdown (only when sectors exist) */}
          {availableSectors.length > 0 && (
            <div className="relative flex items-center h-9 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 focus-within:border-blue-500 dark:focus-within:border-blue-400 rounded-lg transition-all">
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 pl-2.5 pr-1 select-none pointer-events-none whitespace-nowrap">
                Sector
              </span>
              <select
                value={filters.sector}
                onChange={(e) => onFilterChange({ sector: e.target.value })}
                className="appearance-none bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-100 pl-1 pr-6 h-full cursor-pointer outline-none max-w-[120px]"
                title="Filter by sector"
              >
                <option value="" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">All Sectors</option>
                {availableSectors.map((sec) => (
                  <option key={sec} value={sec} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">
                    {sec}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2" />
            </div>
          )}

          {/* 6. Clear Filters (amber highlight when active) */}
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={onResetFilters}
              className="h-9 px-3 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border border-amber-400/50 hover:bg-amber-100 dark:hover:bg-amber-500/20 rounded-lg flex items-center gap-1.5"
              title="Clear all active filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear</span>
            </Button>
          )}
        </div>

        {/* ======================== UTILITY CONTROLS (RIGHT) ======================== */}
        <div className="flex flex-wrap items-center gap-2">

          {/* Clusters Toggle + Radius */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 h-9">
            <input
              type="checkbox"
              id="toggle-clusters"
              checked={filters.showClusters}
              onChange={(e) => onFilterChange({ showClusters: e.target.checked })}
              className="w-3.5 h-3.5 accent-blue-600 rounded cursor-pointer"
            />
            <label 
              htmlFor="toggle-clusters" 
              className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none"
            >
              <Layers className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
              <span>Clusters</span>
            </label>
            {filters.showClusters && (
              <select
                value={filters.radiusKm}
                onChange={(e) => onFilterChange({ radiusKm: parseFloat(e.target.value) })}
                className="bg-transparent text-[11px] font-mono font-semibold text-slate-800 dark:text-slate-200 outline-none cursor-pointer ml-1 border-l border-slate-200 dark:border-slate-800 pl-1.5"
                title="Cluster proximity radius"
              >
                <option value={0.5} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">0.5 km</option>
                <option value={1.0} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">1.0 km</option>
                <option value={2.0} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">2.0 km</option>
                <option value={5.0} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">5.0 km</option>
              </select>
            )}
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden lg:block" />

          {/* Count badge */}
          <div className="hidden sm:flex items-center px-2.5 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
            <span className="font-mono font-bold text-slate-900 dark:text-white mr-1">
              {totalVisibleCount.toLocaleString()}
            </span>
            <span>plotted</span>
          </div>

          {/* Fit Projects */}
          <Button
            variant="outline"
            size="sm"
            onClick={onFitProjects}
            className="h-9 px-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg flex items-center gap-1.5"
            title="Fit map to visible projects"
          >
            <Maximize2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span className="hidden sm:inline">Fit</span>
          </Button>

          {/* Reset View */}
          <Button
            variant="outline"
            size="sm"
            onClick={onResetView}
            className="h-9 px-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg flex items-center gap-1.5"
            title="Reset map to India overview"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span className="hidden sm:inline">Reset</span>
          </Button>

        </div>
      </div>
    </div>
  );
};


export default GISFiltersBar;

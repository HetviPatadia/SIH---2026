import React, { useState, useEffect } from 'react';
import { Search, RotateCcw, MapPin } from 'lucide-react';
import { api } from '../../api/endpoints';
import { usePublicLanguage } from '../../context/PublicLanguageContext';

export interface PublicProjectFilters {
  state?: string;
  district?: string;
  constituency?: string;
  block?: string;
  village?: string;
  sector?: string;
  status?: string;
  search?: string;
}

interface LocationFilterBarProps {
  filters: PublicProjectFilters;
  onFilterChange: (newFilters: PublicProjectFilters) => void;
  onResetFilters: () => void;
  resultCount?: number;
}

const SECTORS = [
  'Rural Connectivity & Roads',
  'Community Infrastructure',
  'Water & Sanitation',
  'Education',
  'Health & Family Welfare',
  'Renewable Energy',
  'Irrigation & Flood Control',
];

const STATUSES = ['Completed', 'In Progress', 'Sanctioned'];

export const LocationFilterBar: React.FC<LocationFilterBarProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  resultCount,
}) => {
  const { t } = usePublicLanguage();
  const [states, setStates] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [constituencies, setConstituencies] = useState<string[]>([]);
  const [blocks, setBlocks] = useState<string[]>([]);
  const [villages, setVillages] = useState<string[]>([]);

  // Fetch States on mount
  useEffect(() => {
    api.public.getStates()
      .then(setStates)
      .catch((err) => console.error('Error fetching states:', err));
  }, []);

  // Fetch Districts when State changes
  useEffect(() => {
    api.public.getDistricts(filters.state)
      .then(setDistricts)
      .catch((err) => console.error('Error fetching districts:', err));
  }, [filters.state]);

  // Fetch Constituencies when State/District change
  useEffect(() => {
    api.public.getConstituencies(filters.state, filters.district)
      .then(setConstituencies)
      .catch((err) => console.error('Error fetching constituencies:', err));
  }, [filters.state, filters.district]);

  // Fetch Blocks when location hierarchy changes
  useEffect(() => {
    api.public.getBlocks(filters.state, filters.district, filters.constituency)
      .then(setBlocks)
      .catch((err) => console.error('Error fetching blocks:', err));
  }, [filters.state, filters.district, filters.constituency]);

  // Fetch Villages when parent location changes
  useEffect(() => {
    api.public.getVillages(filters.state, filters.district, filters.constituency, filters.block)
      .then(setVillages)
      .catch((err) => console.error('Error fetching villages:', err));
  }, [filters.state, filters.district, filters.constituency, filters.block]);

  const handleSelectState = (val: string) => {
    onFilterChange({
      ...filters,
      state: val || undefined,
      district: undefined,
      constituency: undefined,
      block: undefined,
      village: undefined,
    });
  };

  const handleSelectDistrict = (val: string) => {
    onFilterChange({
      ...filters,
      district: val || undefined,
      constituency: undefined,
      block: undefined,
      village: undefined,
    });
  };

  const handleSelectConstituency = (val: string) => {
    onFilterChange({
      ...filters,
      constituency: val || undefined,
      block: undefined,
      village: undefined,
    });
  };

  const handleSelectBlock = (val: string) => {
    onFilterChange({
      ...filters,
      block: val || undefined,
      village: undefined,
    });
  };

  const handleSelectVillage = (val: string) => {
    onFilterChange({
      ...filters,
      village: val || undefined,
    });
  };

  const hasActiveFilters = Boolean(
    filters.state || filters.district || filters.constituency || filters.block || filters.village || filters.sector || filters.status || filters.search
  );

  return (
    <div className="bg-surface border border-border rounded-xl shadow-sm p-4 space-y-4">
      {/* Header & Status Indicator */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              {t('filters.title', t('filter_title', 'Filter Public Works'))}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {t('filters_subtitle', 'Progressive administrative hierarchy (State → District → Constituency → Block → Village)')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {resultCount !== undefined && (
            <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-md bg-surface-muted border border-border text-foreground">
              {resultCount} {t('table.results', t('projects_found', 'public works found'))}
            </span>
          )}

          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-surface-muted hover:bg-surface-elevated border border-border rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t('filters.resetFilters', t('clear_filters', 'Reset Filters'))}</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Breadcrumb Summary Bar */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg bg-surface-muted/60 border border-border/80 text-xs">
          <span className="font-semibold text-muted-foreground">{t('selected_location', 'Selected Location')}:</span>
          {filters.state && (
            <span className="px-2 py-0.5 rounded bg-primary/10 border border-primary/30 text-primary font-medium">
              {filters.state}
            </span>
          )}
          {filters.district && (
            <>
              <span className="text-muted-foreground">&rarr;</span>
              <span className="px-2 py-0.5 rounded bg-primary/10 border border-primary/30 text-primary font-medium">
                {filters.district}
              </span>
            </>
          )}
          {filters.constituency && (
            <>
              <span className="text-muted-foreground">&rarr;</span>
              <span className="px-2 py-0.5 rounded bg-primary/10 border border-primary/30 text-primary font-medium">
                {filters.constituency}
              </span>
            </>
          )}
          {filters.block && (
            <>
              <span className="text-muted-foreground">&rarr;</span>
              <span className="px-2 py-0.5 rounded bg-primary/10 border border-primary/30 text-primary font-medium">
                {filters.block}
              </span>
            </>
          )}
          {filters.village && (
            <>
              <span className="text-muted-foreground">&rarr;</span>
              <span className="px-2 py-0.5 rounded bg-primary/10 border border-primary/30 text-primary font-medium">
                {filters.village}
              </span>
            </>
          )}
          {filters.sector && (
            <span className="px-2 py-0.5 rounded bg-success/10 border border-success/30 text-success font-medium">
              {t(`sectors.${filters.sector}`, filters.sector)}
            </span>
          )}
          {filters.status && (
            <span className="px-2 py-0.5 rounded bg-warning/10 border border-warning/30 text-warning font-medium">
              {t(`statusTypes.${filters.status}`, filters.status)}
            </span>
          )}
        </div>
      )}

      {/* Filter Dropdown Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* State Filter */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
            <span>{t('filters.state', t('state_label', 'State'))}</span>
            {states.length > 0 && <span className="text-[10px] text-muted-foreground font-mono">({states.length})</span>}
          </label>
          <select
            value={filters.state || ''}
            onChange={(e) => handleSelectState(e.target.value)}
            className="w-full h-9 px-3 text-xs bg-surface-elevated border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
          >
            <option value="">{t('filters.allStates', t('select_state', 'All States'))}</option>
            {states.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* District Filter */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
            <span>{t('filters.district', t('district_label', 'District'))}</span>
            {districts.length > 0 && <span className="text-[10px] text-muted-foreground font-mono">({districts.length})</span>}
          </label>
          <select
            value={filters.district || ''}
            onChange={(e) => handleSelectDistrict(e.target.value)}
            disabled={districts.length === 0}
            className="w-full h-9 px-3 text-xs bg-surface-elevated border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium disabled:opacity-50"
          >
            <option value="">{filters.state ? `${t('filters.allDistricts', t('select_district', 'All Districts'))} (${filters.state})` : t('filters.allDistricts', 'All Districts')}</option>
            {districts.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* Constituency Filter */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
            <span>{t('filters.constituency', t('constituency_label', 'Constituency'))}</span>
          </label>
          <select
            value={filters.constituency || ''}
            onChange={(e) => handleSelectConstituency(e.target.value)}
            disabled={constituencies.length === 0}
            className="w-full h-9 px-3 text-xs bg-surface-elevated border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium disabled:opacity-50"
          >
            <option value="">{t('filters.allConstituencies', t('select_constituency', 'All Constituencies'))}</option>
            {constituencies.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Block Filter */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
            <span>{t('filters.block', t('block_label', 'Block / Taluka'))}</span>
          </label>
          <select
            value={filters.block || ''}
            onChange={(e) => handleSelectBlock(e.target.value)}
            disabled={blocks.length === 0}
            className="w-full h-9 px-3 text-xs bg-surface-elevated border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium disabled:opacity-50"
          >
            <option value="">{t('filters.allBlocks', t('select_block', 'All Blocks'))}</option>
            {blocks.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        {/* Village Filter */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
            <span>{t('filters.village', t('village_label', 'Village / Ward'))}</span>
          </label>
          <select
            value={filters.village || ''}
            onChange={(e) => handleSelectVillage(e.target.value)}
            disabled={villages.length === 0}
            className="w-full h-9 px-3 text-xs bg-surface-elevated border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium disabled:opacity-50"
          >
            <option value="">{t('filters.allVillages', t('select_village', 'All Villages'))}</option>
            {villages.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Secondary Category & Keyword Search Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/60">
        {/* Sector Filter */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            {t('filters.sector', t('sector_label', 'Sector / Category'))}
          </label>
          <select
            value={filters.sector || ''}
            onChange={(e) => onFilterChange({ ...filters, sector: e.target.value || undefined })}
            className="w-full h-9 px-3 text-xs bg-surface-elevated border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
          >
            <option value="">{t('filters.allSectors', t('all_sectors', 'All Sectors'))}</option>
            {SECTORS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            {t('filters.status', t('status_label', 'Project Status'))}
          </label>
          <select
            value={filters.status || ''}
            onChange={(e) => onFilterChange({ ...filters, status: e.target.value || undefined })}
            className="w-full h-9 px-3 text-xs bg-surface-elevated border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
          >
            <option value="">{t('filters.allStatuses', t('all_statuses', 'All Statuses'))}</option>
            {STATUSES.map((st) => (
              <option key={st} value={st}>{t(`statusTypes.${st}`, st)}</option>
            ))}
          </select>
        </div>

        {/* Text Keyword Search */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            {t('filters.searchKeyword', t('search_label', 'Keyword Search'))}
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
            <input
              type="text"
              value={filters.search || ''}
              onChange={(e) => onFilterChange({ ...filters, search: e.target.value || undefined })}
              placeholder={t('hero.quickSearchPlaceholder', t('search_placeholder', 'Search by project title, sector, village or contractor...'))}
              className="w-full h-9 pl-9 pr-3 text-xs bg-surface-elevated border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

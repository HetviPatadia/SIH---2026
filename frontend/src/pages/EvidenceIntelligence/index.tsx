import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { PageContainer } from '../../components/layout/PageContainer';
import { Button } from '../../components/ui/Button';
import { EvidenceSummaryBar } from './components/EvidenceSummaryBar';
import { EvidenceFilterBar, type EvidenceFilters } from './components/EvidenceFilterBar';
import { EvidenceTable } from './components/EvidenceTable';
import { EvidenceDetailDrawer } from './components/EvidenceDetailDrawer';
import { api } from '../../api/endpoints';
import type { GlobalEvidenceItem } from '../../types/evidence';
import {
  RefreshCw,
  GitCompare,
  ShieldAlert,
  X,
  FolderOpen
} from 'lucide-react';

export const EvidenceIntelligencePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read initial URL params
  const paramProjectId = searchParams.get('projectId') || undefined;
  const paramEvidenceId = searchParams.get('evidenceId') || null;
  const paramStatus = searchParams.get('status') || '';
  const paramType = searchParams.get('type') || '';
  const paramSimilarity = searchParams.get('hasSimilaritySignal') === 'true';

  // 1. Filter and Pagination States
  const [filters, setFilters] = useState<EvidenceFilters>({
    search: '',
    projectId: paramProjectId,
    evidenceType: paramType,
    status: paramStatus,
    hasSimilaritySignal: paramSimilarity,
    hasLocationSignal: false,
    hasTemporalSignal: false,
  });

  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // 2. Data States
  const [evidenceItems, setEvidenceItems] = useState<GlobalEvidenceItem[]>([]);
  const [total, setTotal] = useState<number>(0);

  // 3. UI and Loading States
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 4. Detail Drawer Preview State
  const [selectedEvidence, setSelectedEvidence] = useState<GlobalEvidenceItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Search debounce ref
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch Evidence List from API
  const fetchEvidence = useCallback(
    async (currentFilters: EvidenceFilters, currentPage: number, currentPageSize: number) => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.evidence.list({
          page: currentPage,
          page_size: currentPageSize,
          search: currentFilters.search.trim() || undefined,
          project_id: currentFilters.projectId || undefined,
          evidence_type: currentFilters.evidenceType || undefined,
          status: currentFilters.status || undefined,
          has_similarity_signal: currentFilters.hasSimilaritySignal ? true : undefined,
          has_location_signal: currentFilters.hasLocationSignal ? true : undefined,
          has_temporal_signal: currentFilters.hasTemporalSignal ? true : undefined,
        });

        setEvidenceItems(response.items || []);
        setTotal(response.total || 0);

        // If URL requested a specific evidenceId, auto-select it if found
        if (paramEvidenceId && !selectedEvidence) {
          const matched = response.items?.find((item) => item.evidence_id === paramEvidenceId);
          if (matched) {
            setSelectedEvidence(matched);
            setIsDrawerOpen(true);
          }
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to query evidence intelligence ledger';
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [paramEvidenceId, selectedEvidence]
  );

  // Trigger fetch on filters/pagination change
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (filters.search) {
      searchTimeoutRef.current = setTimeout(() => {
        fetchEvidence(filters, page, pageSize);
      }, 350);
    } else {
      fetchEvidence(filters, page, pageSize);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [filters, page, pageSize, fetchEvidence]);

  // Sync when URL search params change externally
  useEffect(() => {
    const urlProjectId = searchParams.get('projectId') || undefined;
    if (urlProjectId !== filters.projectId) {
      setFilters((prev) => ({ ...prev, projectId: urlProjectId }));
      setPage(1);
    }
  }, [searchParams, filters.projectId]);

  // Handle filter changes
  const handleFilterChange = (newFilters: Partial<EvidenceFilters>) => {
    setFilters((prev) => {
      const updated = { ...prev, ...newFilters };
      // Sync projectId with URL search params
      if ('projectId' in newFilters) {
        const newParams = new URLSearchParams(searchParams);
        if (newFilters.projectId) {
          newParams.set('projectId', newFilters.projectId);
        } else {
          newParams.delete('projectId');
        }
        setSearchParams(newParams, { replace: true });
      }
      return updated;
    });
    setPage(1);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setFilters({
      search: '',
      projectId: undefined,
      evidenceType: '',
      status: '',
      hasSimilaritySignal: false,
      hasLocationSignal: false,
      hasTemporalSignal: false,
    });
    setPage(1);
    setSearchParams({}, { replace: true });
  };

  // Manual Refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchEvidence(filters, page, pageSize);
  };

  // Open Inspector Drawer
  const handleSelectEvidence = (item: GlobalEvidenceItem) => {
    setSelectedEvidence(item);
    setIsDrawerOpen(true);
  };

  // Close Inspector Drawer
  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
  };

  return (
    <PageContainer
      title="Asset Evidence Intelligence"
      description="Photographic and documentary evidence registry with cryptographic SHA-256 verification, EXIF inspection, and perceptual reuse detection."
      actions={
        <div className="flex items-center gap-2">
          <Link to="/evidence/compare">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<GitCompare className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Compare Evidence
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />}
            className="text-xs"
          >
            {refreshing ? 'Syncing...' : 'Refresh'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Project Context Filter Banner (if navigating from a specific project) */}
        {filters.projectId && (
          <div className="rounded-lg border border-primary/40 bg-primary/10 p-3 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <FolderOpen className="w-4 h-4 text-primary shrink-0" />
              <div className="min-w-0">
                <span className="font-semibold text-foreground">Filtered for Project: </span>
                <span className="font-mono text-primary font-bold">{filters.projectId}</span>
                <span className="text-muted-foreground ml-2">
                  (Showing only evidence submitted for this sanction)
                </span>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFilterChange({ projectId: undefined })}
              leftIcon={<X className="w-3 h-3" />}
              className="h-7 text-xs text-muted-foreground hover:text-foreground shrink-0"
            >
              Clear Project Filter
            </Button>
          </div>
        )}

        {/* Audit Mandate Alert */}
        <div className="rounded-lg border border-border bg-surface-muted/40 p-3 flex items-start gap-3">
          <ShieldAlert className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">
              Physical Verification & Forensic Integrity Registry
            </p>
            <p className="leading-relaxed">
              Evidence artifacts are screened via <strong className="text-foreground">cryptographic SHA-256 digests</strong>,{' '}
              <strong className="text-foreground">perceptual hash matching (pHash)</strong>, and{' '}
              <strong className="text-foreground">EXIF sensor telemetry</strong>. Signals highlight potential reuse or metadata
              inconsistencies requiring human field verification, not autonomous adverse conclusions.
            </p>
          </div>
        </div>

        {/* 1. Top Compact Metrics KPI Bar */}
        <EvidenceSummaryBar />

        {/* 2. Filter & Search Toolbar */}
        <EvidenceFilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onReset={handleResetFilters}
          totalResults={total}
        />

        {/* 3. Main Evidence Table */}
        <EvidenceTable
          items={evidenceItems}
          loading={loading}
          error={error}
          onRetry={handleRefresh}
          selectedEvidenceId={selectedEvidence?.evidence_id ?? null}
          onSelectEvidence={handleSelectEvidence}
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />

        {/* 4. Side Evidence Inspector Drawer */}
        <EvidenceDetailDrawer
          item={selectedEvidence}
          isOpen={isDrawerOpen}
          onClose={handleCloseDrawer}
        />
      </div>
    </PageContainer>
  );
};

export default EvidenceIntelligencePage;

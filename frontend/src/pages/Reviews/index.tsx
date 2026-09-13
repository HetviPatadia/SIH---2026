import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PageContainer } from '../../components/layout/PageContainer';
import { Button } from '../../components/ui/Button';
import { ReviewFilterBar, type ReviewFilters } from './components/ReviewFilterBar';
import { ReviewTable } from './components/ReviewTable';
import { ReviewDetailDrawer } from './components/ReviewDetailDrawer';
import { ReviewStatusTabs } from './components/ReviewStatusTabs';
import { api } from '../../api/endpoints';
import type { ProjectItem } from '../../types/project';
import type { CaseSummaryResponse } from '../../types/investigation';
import { RefreshCw, ArrowLeft, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ReviewsPage: React.FC = () => {
  // 1. Filter and Pagination States
  const [filters, setFilters] = useState<ReviewFilters>({
    search: '',
    priority: '',
    reviewStatus: '',
    sortBy: 'audit_priority',
    sortOrder: 'desc',
  });

  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // 2. Data States
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [summary, setSummary] = useState<CaseSummaryResponse | null>(null);

  // 3. UI and Loading States
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 4. Detail Drawer Preview State
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Debounce search input ref
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch Summary KPIs for Tabs
  const fetchSummary = useCallback(async () => {
    try {
      const data = await api.investigations.getSummary();
      setSummary(data);
    } catch {
      // Non-critical, tabs will default safely
    }
  }, []);

  // Fetch Projects Review Queue
  const fetchProjects = useCallback(
    async (currentFilters: ReviewFilters, currentPage: number, currentPageSize: number) => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.projects.list({
          page: currentPage,
          page_size: currentPageSize,
          priority: currentFilters.priority || undefined,
          review_status: currentFilters.reviewStatus || undefined,
          search: currentFilters.search.trim() || undefined,
          sort_by: currentFilters.sortBy || 'audit_priority',
          sort_order: currentFilters.sortOrder || 'desc',
        });

        setProjects(response.items || []);
        setTotal(response.total || 0);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to query review queue';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Trigger fetch on filters/pagination change with debounce for search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (filters.search) {
      // Debounce search typing
      searchTimeoutRef.current = setTimeout(() => {
        fetchProjects(filters, page, pageSize);
      }, 350);
    } else {
      fetchProjects(filters, page, pageSize);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [filters, page, pageSize, fetchProjects]);

  // Initial Summary load
  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Handler for individual filter change
  const handleFilterChange = (key: keyof ReviewFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page on filter change
  };

  // Quick tab filter selector
  const handleSelectTab = (priority: string, status: string) => {
    setFilters((prev) => ({
      ...prev,
      priority,
      reviewStatus: status,
      search: '', // Clear text search when selecting specific queue tab
    }));
    setPage(1);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setFilters({
      search: '',
      priority: '',
      reviewStatus: '',
      sortBy: 'audit_priority',
      sortOrder: 'desc',
    });
    setPage(1);
  };

  // Manual Refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchProjects(filters, page, pageSize), fetchSummary()]);
    setRefreshing(false);
  };

  // Drawer interactions
  const handleOpenDrawer = (project: ProjectItem) => {
    setSelectedProject(project);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
  };

  return (
    <PageContainer
      title="Audit Review Work Queue"
      description="Operational queue of public works requiring administrative inspection, evidence verification, and adjudication."
      actions={
        <div className="flex items-center gap-2">
          <Link to="/dashboard">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Back to Dashboard
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
            Refresh Queue
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Human-in-the-Loop Review Mandate */}
        <div className="rounded-lg border border-border bg-surface-muted/40 p-3 flex items-start gap-3">
          <ShieldAlert className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">
              Human Audit Decision-Support Queue
            </p>
            <p className="leading-relaxed">
              Items are ordered by <strong className="text-foreground">Audit Priority</strong> calculated from spatial proximity,
              procurement clustering, and image reuse signals. All findings represent potential irregularities requiring
              substantive verification and physical audit, not autonomous fraud determinations.
            </p>
          </div>
        </div>

        {/* 1. Quick Queue Status & Priority Tabs */}
        <ReviewStatusTabs
          summary={summary}
          activePriority={filters.priority}
          activeStatus={filters.reviewStatus}
          onSelectTab={handleSelectTab}
          totalProjects={total}
        />

        {/* 2. Search and Filter Bar */}
        <ReviewFilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onReset={handleResetFilters}
          totalResults={total}
        />

        {/* 3. Main Review Queue Table */}
        <ReviewTable
          projects={projects}
          loading={loading}
          error={error}
          onRetry={() => fetchProjects(filters, page, pageSize)}
          onSelectProject={handleOpenDrawer}
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />

        {/* 4. Side Drawer Project Preview */}
        <ReviewDetailDrawer
          project={selectedProject}
          isOpen={isDrawerOpen}
          onClose={handleCloseDrawer}
        />
      </div>
    </PageContainer>
  );
};

export default ReviewsPage;

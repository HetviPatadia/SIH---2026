import React, { useEffect, useState, useCallback, useRef } from 'react';
import { PageContainer } from '../../components/layout/PageContainer';
import { Button } from '../../components/ui/Button';
import { SummaryMetrics } from './components/SummaryMetrics';
import { PriorityReviewQueue } from './components/PriorityReviewQueue';
import { AnomalySummary } from './components/AnomalySummary';
import { SystemStatus } from './components/SystemStatus';
import { api } from '../../api/endpoints';
import type { AnomalySummaryResponse, SystemHealthResponse } from '../../types/api';
import type { EvidenceSummaryResponse } from '../../types/evidence';
import type { ProjectItem, AnalysisRunItem } from '../../types/project';
import { RefreshCw, ArrowRight, ShieldCheck, Activity, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  // 1. Data States
  const [anomalySummary, setAnomalySummary] = useState<AnomalySummaryResponse | null>(null);
  const [evidenceSummary, setEvidenceSummary] = useState<EvidenceSummaryResponse | null>(null);
  const [highPriorityProjects, setHighPriorityProjects] = useState<ProjectItem[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealthResponse | null>(null);
  const [latestRun, setLatestRun] = useState<AnalysisRunItem | null>(null);

  // Active Filter for dashboard works (default to high priority)
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'HIGH_PRIORITY' | 'CRITICAL' | 'HIGH'>('HIGH_PRIORITY');
  const queueRef = useRef<HTMLDivElement>(null);

  // 2. Loading & Error States (handled independently for resilience)
  const [loadingMetrics, setLoadingMetrics] = useState<boolean>(true);
  const [loadingProjects, setLoadingProjects] = useState<boolean>(true);
  const [loadingHealth, setLoadingHealth] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // 3. Independent Fetch Handlers
  const fetchSummaryMetrics = useCallback(async () => {
    setLoadingMetrics(true);
    setMetricsError(null);
    try {
      const [anomRes, evidRes] = await Promise.allSettled([
        api.anomalies.getSummary(),
        api.evidence.getSummary(),
      ]);

      if (anomRes.status === 'fulfilled') {
        setAnomalySummary(anomRes.value);
      } else {
        setMetricsError('Failed to load anomaly summary');
      }

      if (evidRes.status === 'fulfilled') {
        setEvidenceSummary(evidRes.value);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error fetching summary';
      setMetricsError(message);
    } finally {
      setLoadingMetrics(false);
    }
  }, []);

  const fetchProjectsByFilter = useCallback(async (filter: 'ALL' | 'HIGH_PRIORITY' | 'CRITICAL' | 'HIGH') => {
    setLoadingProjects(true);
    setProjectsError(null);
    try {
      if (filter === 'CRITICAL') {
        const res = await api.projects.list({ priority: 'CRITICAL', page_size: 15, sort_by: 'audit_priority', sort_order: 'desc' });
        setHighPriorityProjects(res.items || []);
      } else if (filter === 'HIGH') {
        const res = await api.projects.list({ priority: 'HIGH', page_size: 15, sort_by: 'audit_priority', sort_order: 'desc' });
        setHighPriorityProjects(res.items || []);
      } else if (filter === 'HIGH_PRIORITY') {
        const res = await api.projects.list({ priority: 'HIGH,CRITICAL', page_size: 15, sort_by: 'audit_priority', sort_order: 'desc' });
        setHighPriorityProjects(res.items || []);
      } else {
        const res = await api.projects.list({ page_size: 15, sort_by: 'audit_priority', sort_order: 'desc' });
        setHighPriorityProjects(res.items || []);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error fetching projects';
      setProjectsError(message);
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  const handleFilterSelect = useCallback((filter: 'ALL' | 'HIGH_PRIORITY' | 'CRITICAL' | 'HIGH') => {
    setActiveFilter(filter);
    fetchProjectsByFilter(filter);
    if (queueRef.current) {
      queueRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [fetchProjectsByFilter]);

  const fetchSystemHealth = useCallback(async () => {
    setLoadingHealth(true);
    setHealthError(null);
    try {
      const data = await api.system.getHealth();
      setSystemHealth(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error fetching health';
      setHealthError(message);
    } finally {
      setLoadingHealth(false);
    }
  }, []);

  const fetchLatestRun = useCallback(async () => {
    try {
      const runs = await api.analysis.listRuns({ limit: 1 });
      if (runs && runs.length > 0) {
        setLatestRun(runs[0]);
      }
    } catch (err) {
      console.warn('Latest run fetch note:', err);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchSummaryMetrics(),
      fetchProjectsByFilter(activeFilter),
      fetchSystemHealth(),
      fetchLatestRun(),
    ]);
    setLastUpdated(new Date());
    setRefreshing(false);
  }, [fetchSummaryMetrics, fetchProjectsByFilter, activeFilter, fetchSystemHealth, fetchLatestRun]);

  // Initial Load
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  return (
    <PageContainer
      title="Audit Intelligence Dashboard"
      description="Operational oversight of high-priority flagged works, multi-modal anomaly distributions, and forensic verification backlogs."
      actions={
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="hidden sm:inline-block text-[11px] font-mono text-muted-foreground">
              Updated: {lastUpdated.toLocaleTimeString('en-IN', { hour12: false })}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAll}
            disabled={refreshing}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />}
          >
            {refreshing ? 'Syncing...' : 'Sync'}
          </Button>
          <Link to="/reviews">
            <Button size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              Open Review Queue
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Compliance & Human Verification Mandate Notice */}
        <div className="rounded-lg border border-border bg-surface-muted/40 p-3.5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-foreground">
                Institutional Audit Standard & Human-in-the-Loop Mandate
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Scores indicate <strong className="text-foreground font-medium">Audit Priority</strong> calculated
                via spatial clustering, procurement velocity, and asset verification checks. Flags represent{' '}
                <strong className="text-foreground font-medium">potential irregularities</strong> requiring human
                adjudication and field verification, not automated determinations.
              </p>
            </div>
          </div>
          <span className="hidden md:inline-flex text-[10px] font-mono px-2 py-0.5 rounded bg-surface border border-border text-muted-foreground whitespace-nowrap">
            Rule 26102-AUDIT-v1
          </span>
        </div>

        {/* Recent Intelligence Activity (Compact Level 1/2) */}
        {latestRun && (
          <div className="p-3 rounded-lg bg-surface border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                <Activity className="w-3.5 h-3.5 text-primary" />
                Recent Intelligence Run:
              </span>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-surface-muted border border-border text-foreground font-medium">
                {latestRun.run_id}
              </span>
              <span className="text-muted-foreground">• Dataset: <strong className="text-foreground font-mono">{latestRun.dataset_version}</strong></span>
              <span className="text-muted-foreground">• Flagged: <strong className="text-amber-500 font-mono">{latestRun.anomalies_flagged}</strong> / {latestRun.total_analyzed} works</span>
            </div>
            <Link to="/system" className="text-primary hover:underline text-[11px] flex items-center gap-1 self-end sm:self-auto shrink-0 font-medium">
              <span>View Provenance</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        )}

        {/* 1. Top Executive Summary Metrics (Clickable KPIs) */}
        <SummaryMetrics
          anomalySummary={anomalySummary}
          evidenceSummary={evidenceSummary}
          loading={loadingMetrics}
          error={metricsError}
          activeFilter={activeFilter}
          onSelectFilter={handleFilterSelect}
        />

        {/* 2. Main Investigation Workspace (Queue on left, Breakdown on right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Priority Review Queue (7/12 on lg, 8/12 on xl) */}
          <div ref={queueRef} className="lg:col-span-7 xl:col-span-8 scroll-mt-6">
            <PriorityReviewQueue
              projects={highPriorityProjects}
              loading={loadingProjects}
              error={projectsError}
              onRetry={() => fetchProjectsByFilter(activeFilter)}
              activeFilter={activeFilter}
              onFilterChange={handleFilterSelect}
            />
          </div>

          {/* Right Column: Anomaly Summary & Pattern Breakdown (5/12 on lg, 4/12 on xl) */}
          <div className="lg:col-span-5 xl:col-span-4">
            <AnomalySummary
              data={anomalySummary}
              loading={loadingMetrics}
              error={metricsError}
            />
          </div>
        </div>

        {/* 3. Operational System Health & Benchmark Provenance Footer */}
        <SystemStatus
          health={systemHealth}
          loading={loadingHealth}
          error={healthError}
        />
      </div>
    </PageContainer>
  );
};

export default DashboardPage;

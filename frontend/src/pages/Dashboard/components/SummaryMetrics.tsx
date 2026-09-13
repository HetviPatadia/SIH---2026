import React from 'react';
import { Card } from '../../../components/ui/Card';
import type { AnomalySummaryResponse } from '../../../types/api';
import type { EvidenceSummaryResponse } from '../../../types/evidence';
import { Layers, AlertTriangle, ShieldAlert, FileCheck2 } from 'lucide-react';

interface SummaryMetricsProps {
  anomalySummary: AnomalySummaryResponse | null;
  evidenceSummary: EvidenceSummaryResponse | null;
  loading: boolean;
  error?: string | null;
  activeFilter?: 'ALL' | 'HIGH_PRIORITY' | 'CRITICAL' | 'HIGH';
  onSelectFilter?: (filter: 'ALL' | 'HIGH_PRIORITY' | 'CRITICAL' | 'HIGH') => void;
}

export const SummaryMetrics: React.FC<SummaryMetricsProps> = ({
  anomalySummary,
  evidenceSummary,
  loading,
  error,
  activeFilter = 'HIGH_PRIORITY',
  onSelectFilter,
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-4 flex flex-col justify-between h-28 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="h-3 w-28 bg-surface-highest rounded" />
              <div className="h-7 w-7 bg-surface-highest rounded-md" />
            </div>
            <div className="space-y-1.5">
              <div className="h-6 w-20 bg-surface-highest rounded" />
              <div className="h-2.5 w-36 bg-surface-highest rounded" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (error && !anomalySummary) {
    return (
      <div className="rounded-lg border border-danger/30 bg-danger-surface p-4 text-xs text-danger flex items-center justify-between">
        <span>Unable to load executive KPI summary metrics.</span>
      </div>
    );
  }

  const totalProjects = anomalySummary?.total_projects ?? 0;
  const highPriority = anomalySummary?.high_priority_flags ?? 0;
  const criticalCount = anomalySummary?.priority_breakdown?.CRITICAL ?? 0;
  const highCount = anomalySummary?.priority_breakdown?.HIGH ?? 0;
  const mediumCount = anomalySummary?.priority_breakdown?.MEDIUM ?? 0;
  const totalAnomalies = criticalCount + highCount + mediumCount;

  const reuseSignals = evidenceSummary?.potential_reuse_signals ?? 0;
  const highPriorityEvidence = evidenceSummary?.high_priority_evidence_cases ?? 0;

  const isHighPriorityActive = activeFilter === 'HIGH_PRIORITY' || activeFilter === 'CRITICAL' || activeFilter === 'HIGH';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Projects Analyzed (Clickable -> Show All) */}
      <Card 
        hoverElevate 
        onClick={() => onSelectFilter?.('ALL')}
        className={`p-4 flex flex-col justify-between animate-stagger-1 cursor-pointer transition-all group ${
          activeFilter === 'ALL'
            ? 'ring-2 ring-primary border-primary bg-primary/5 dark:bg-primary/10 shadow-md scale-[1.01]'
            : 'hover:border-primary/50'
        }`}
        title="Click to view all monitored works in the queue below"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors">
            Projects Analyzed
          </span>
          <div className="flex items-center gap-1.5">
            {activeFilter === 'ALL' && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary text-white uppercase">
                Active
              </span>
            )}
            <div className="w-7 h-7 rounded-md bg-primary-muted/20 border border-primary/20 flex items-center justify-center text-primary">
              <Layers className="w-4 h-4" />
            </div>
          </div>
        </div>
        <div className="mt-2">
          <div className="text-2xl font-bold font-mono text-foreground tracking-tight">
            {totalProjects.toLocaleString()}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            Monitored works in active benchmark
          </p>
        </div>
      </Card>

      {/* 2. High-Priority Reviews (Clickable -> Show High Priority Only) */}
      <Card 
        hoverElevate 
        onClick={() => onSelectFilter?.('HIGH_PRIORITY')}
        className={`p-4 flex flex-col justify-between animate-stagger-2 cursor-pointer transition-all group ${
          isHighPriorityActive
            ? 'ring-2 ring-danger border-danger bg-danger-surface/80 dark:bg-rose-950/30 shadow-md scale-[1.01]'
            : 'border-danger/30 hover:border-danger/60'
        }`}
        title="Click to filter and show ONLY high-priority projects in the queue below"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-danger uppercase tracking-wider flex items-center gap-1">
            <span>High-Priority Reviews</span>
          </span>
          <div className="flex items-center gap-1.5">
            {isHighPriorityActive && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-danger text-white uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                Active
              </span>
            )}
            <div className="w-7 h-7 rounded-md bg-danger-surface border border-danger/30 flex items-center justify-center text-danger">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
        </div>
        <div className="mt-2">
          <div className="text-2xl font-bold font-mono text-danger tracking-tight">
            {highPriority.toLocaleString()}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {criticalCount} Critical + {highCount} High priority works
          </p>
        </div>
      </Card>

      {/* 3. Anomalies Flagged */}
      <Card hoverElevate className="p-4 flex flex-col justify-between animate-stagger-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Anomalies Flagged
          </span>
          <div className="w-7 h-7 rounded-md bg-warning-surface border border-warning/30 flex items-center justify-center text-warning">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-2xl font-bold font-mono text-foreground tracking-tight">
            {totalAnomalies.toLocaleString()}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            Multi-modal anomaly signals detected
          </p>
        </div>
      </Card>

      {/* 4. Evidence Requiring Review */}
      <Card hoverElevate className="p-4 flex flex-col justify-between animate-stagger-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Evidence Signals
          </span>
          <div className="w-7 h-7 rounded-md bg-info-surface border border-info/30 flex items-center justify-center text-info">
            <FileCheck2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-2xl font-bold font-mono text-foreground tracking-tight">
            {evidenceSummary ? reuseSignals.toLocaleString() : '—'}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {evidenceSummary
              ? `${highPriorityEvidence} high-priority evidence cases`
              : 'Evidence metrics loading...'}
          </p>
        </div>
      </Card>
    </div>
  );
};

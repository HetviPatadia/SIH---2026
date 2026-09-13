import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Link } from 'react-router-dom';
import type { SystemHealthResponse } from '../../../types/api';
import { CheckCircle2, AlertTriangle, Database, Cpu, HardDrive, ArrowRight } from 'lucide-react';

interface SystemStatusProps {
  health: SystemHealthResponse | null;
  loading: boolean;
  error?: string | null;
}

export const SystemStatus: React.FC<SystemStatusProps> = ({ health, loading, error }) => {
  if (loading) {
    return (
      <div className="h-12 w-full rounded-lg bg-surface border border-border animate-pulse" />
    );
  }

  if (error && !health) {
    return (
      <Card className="px-4 py-2.5 bg-warning-surface/30 border border-warning/30 text-xs text-warning flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
          <span>Backend status telemetry temporarily offline: {error}</span>
        </div>
        <span className="font-mono text-[10px] text-muted-foreground">API Connection Retrying</span>
      </Card>
    );
  }

  const isOperational = health?.status === 'OPERATIONAL';
  const dbStatus = health?.components?.database || 'UNKNOWN';
  const aiEngine = health?.components?.ai_engine || 'UNKNOWN';
  const totalLoaded = health?.database_metrics?.total_projects_loaded ?? 0;
  const lastRunId = health?.database_metrics?.last_analysis_run_id;

  return (
    <Card className="px-4 py-3 bg-surface-muted/30 border border-border">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
        {/* Left: Overall Health & Dataset */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 font-medium">
            {isOperational ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
                </span>
                <span className="text-foreground">System Operational</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                <span className="text-warning">System Status: {health?.status || 'Offline'}</span>
              </>
            )}
          </div>

          <span className="text-border">|</span>

          <div className="flex items-center gap-1.5 text-muted-foreground">
            <HardDrive className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Dataset:</span>
            <span className="font-mono text-[11px] text-foreground bg-surface-highest px-1.5 py-0.5 rounded border border-border">
              DEMO-SYNTHETIC-v1
            </span>
            <span className="text-[10px] text-muted-foreground">(Benchmark Synthetic Records)</span>
          </div>
        </div>

        {/* Center: Services Ready */}
        <div className="hidden lg:flex items-center gap-4 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <Database className="w-3 h-3 text-success" />
            <span>Database:</span>
            <span className="font-mono font-medium text-foreground">{dbStatus}</span>
            <span className="font-mono text-muted-foreground">({totalLoaded.toLocaleString()} works)</span>
          </div>

          <div className="flex items-center gap-1">
            <Cpu className="w-3 h-3 text-primary" />
            <span>Multi-Modal AI Core:</span>
            <span className="font-mono font-medium text-foreground">{aiEngine}</span>
          </div>

          {lastRunId && (
            <div className="flex items-center gap-1 truncate max-w-[200px]" title={lastRunId}>
              <CheckCircle2 className="w-3 h-3 text-muted-foreground" />
              <span className="truncate">Run: {lastRunId.split('_').slice(0, 3).join('_')}</span>
            </div>
          )}
        </div>

        {/* Right: Link to System telemetry */}
        <div className="flex items-center gap-2 self-end md:self-center">
          <span className="font-mono text-[10px] text-muted-foreground">v{health?.version || '1.0.0'}</span>
          <Link
            to="/system"
            className="text-primary hover:text-primary-hover font-medium inline-flex items-center gap-1 text-[11px] hover:underline"
          >
            <span>Telemetry</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </Card>
  );
};

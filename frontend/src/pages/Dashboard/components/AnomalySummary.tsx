import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '../../../components/ui/Card';
import type { AnomalySummaryResponse } from '../../../types/api';
import { PieChart, Landmark } from 'lucide-react';

interface AnomalySummaryProps {
  data: AnomalySummaryResponse | null;
  loading: boolean;
  error?: string | null;
}

export const AnomalySummary: React.FC<AnomalySummaryProps> = ({ data, loading, error }) => {
  if (loading) {
    return (
      <Card className="h-full p-4 space-y-4 animate-pulse">
        <div className="h-4 w-40 bg-surface-highest rounded" />
        <div className="h-3 w-56 bg-surface-highest rounded" />
        <div className="space-y-3 pt-2">
          <div className="h-10 bg-surface-highest rounded" />
          <div className="h-20 bg-surface-highest rounded" />
          <div className="h-20 bg-surface-highest rounded" />
        </div>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="h-full p-6 text-center flex flex-col items-center justify-center space-y-2">
        <PieChart className="w-8 h-8 text-muted-foreground/50" />
        <p className="text-xs font-medium text-foreground">Anomaly summary unavailable</p>
        <p className="text-[11px] text-muted-foreground">
          Could not aggregate anomaly distribution metrics for the active benchmark.
        </p>
      </Card>
    );
  }

  const { priority_breakdown, top_flagged_sectors, financials, total_projects } = data;
  const critical = priority_breakdown.CRITICAL || 0;
  const high = priority_breakdown.HIGH || 0;
  const medium = priority_breakdown.MEDIUM || 0;
  const low = priority_breakdown.LOW || 0;

  const maxSectorCount = Math.max(...top_flagged_sectors.map((s) => s.flagged_count), 1);

  // Currency helper (Crores format)
  const formatINR = (val: number) => {
    if (val >= 10000000) {
      return `₹${(val / 10000000).toFixed(2)} Cr`;
    }
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(2)} Lakh`;
    }
    return `₹${val.toLocaleString()}`;
  };

  const utilizationPercent = Math.round((financials.overall_utilization_ratio || 0) * 100);

  return (
    <Card className="flex flex-col h-full space-y-5">
      <CardHeader className="pb-0">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <PieChart className="w-4 h-4 text-primary" />
          <span>Anomaly Pattern Summary</span>
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Distribution across audit priority tiers and key expenditure domains
        </CardDescription>
      </CardHeader>

      <div className="px-5 space-y-5">
        {/* 1. Stacked Priority Distribution Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">Priority Distribution</span>
            <span className="font-mono text-muted-foreground text-[11px]">
              {total_projects.toLocaleString()} Total Works
            </span>
          </div>

          {/* Continuous proportional bar */}
          <div className="h-2.5 w-full rounded-full bg-surface-highest overflow-hidden flex">
            <div
              className="bg-danger transition-all duration-500"
              style={{ width: `${(critical / total_projects) * 100}%` }}
              title={`Critical: ${critical}`}
            />
            <div
              className="bg-warning transition-all duration-500"
              style={{ width: `${(high / total_projects) * 100}%` }}
              title={`High: ${high}`}
            />
            <div
              className="bg-info transition-all duration-500"
              style={{ width: `${(medium / total_projects) * 100}%` }}
              title={`Medium: ${medium}`}
            />
            <div
              className="bg-success transition-all duration-500"
              style={{ width: `${(low / total_projects) * 100}%` }}
              title={`Low: ${low}`}
            />
          </div>

          {/* Priority Breakdown Legend / Grid */}
          <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
            <div className="flex items-center justify-between p-2 rounded-md bg-surface-muted/50 border border-border/40">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-danger shrink-0" />
                <span className="text-[11px] text-muted-foreground">Critical Priority</span>
              </div>
              <span className="font-mono font-semibold text-danger">{critical}</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-md bg-surface-muted/50 border border-border/40">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-warning shrink-0" />
                <span className="text-[11px] text-muted-foreground">High Priority</span>
              </div>
              <span className="font-mono font-semibold text-warning">{high}</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-md bg-surface-muted/50 border border-border/40">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-info shrink-0" />
                <span className="text-[11px] text-muted-foreground">Medium Priority</span>
              </div>
              <span className="font-mono font-semibold text-foreground">{medium}</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-md bg-surface-muted/50 border border-border/40">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-success shrink-0" />
                <span className="text-[11px] text-muted-foreground">Low Priority</span>
              </div>
              <span className="font-mono font-semibold text-foreground">{low}</span>
            </div>
          </div>
        </div>

        {/* 2. Top Flagged Sectors */}
        <div className="space-y-2.5 pt-2 border-t border-border">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">Top Flagged Sectors</span>
            <span className="text-[11px] text-muted-foreground">High / Critical Flags</span>
          </div>

          <div className="space-y-2">
            {top_flagged_sectors.map((sec) => {
              const pct = Math.round((sec.flagged_count / maxSectorCount) * 100);
              return (
                <div key={sec.sector} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-foreground truncate max-w-[200px]" title={sec.sector}>
                      {sec.sector}
                    </span>
                    <span className="font-mono font-medium text-muted-foreground shrink-0">
                      {sec.flagged_count} flagged
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-highest rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Benchmark Financial Oversight */}
        <div className="space-y-2.5 pt-2 border-t border-border pb-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Financial Utilization</span>
            </span>
            <span className="font-mono font-semibold text-xs text-primary">
              {utilizationPercent}%
            </span>
          </div>

          <div className="h-2 w-full bg-surface-highest rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 rounded-full"
              style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
            <div className="p-2 rounded bg-surface-muted/40 border border-border/30">
              <div className="text-muted-foreground">Total Sanctioned</div>
              <div className="font-mono font-semibold text-foreground text-xs mt-0.5">
                {formatINR(financials.total_sanctioned_funds)}
              </div>
            </div>
            <div className="p-2 rounded bg-surface-muted/40 border border-border/30">
              <div className="text-muted-foreground">Recorded Expenditure</div>
              <div className="font-mono font-semibold text-foreground text-xs mt-0.5">
                {formatINR(financials.total_expenditure)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

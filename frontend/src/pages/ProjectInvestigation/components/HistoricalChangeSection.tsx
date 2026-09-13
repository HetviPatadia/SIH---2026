import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { api } from '../../../api/endpoints';
import type { ProjectHistoryResponse } from '../../../types/project';
import { History, ArrowRight, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';

interface HistoricalChangeSectionProps {
  projectId: string;
  currentScore?: number;
}

export const HistoricalChangeSection: React.FC<HistoricalChangeSectionProps> = ({
  projectId,
  currentScore,
}) => {
  const [historyData, setHistoryData] = useState<ProjectHistoryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const data = await api.projects.getHistory(projectId);
        if (isMounted) setHistoryData(data);
      } catch (err) {
        if (isMounted) {
          console.warn('Project history lookup note:', err);
          setHistoryData(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchHistory();
    return () => {
      isMounted = false;
    };
  }, [projectId]);

  if (loading) {
    return (
      <Card className="border border-border/80 bg-surface animate-pulse">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="h-4 w-36 bg-surface-muted rounded" />
            <div className="h-4 w-20 bg-surface-muted rounded" />
          </div>
        </CardHeader>
        <div className="p-4 pt-0 space-y-2">
          <div className="h-12 bg-surface-muted rounded" />
        </div>
      </Card>
    );
  }

  const snapshots = historyData?.snapshots || [];
  const latestSnapshot = snapshots[0];
  const previousSnapshot = snapshots[1];

  // If there are no snapshots or only 1 baseline snapshot with no previous score
  const hasMultipleSnapshots = snapshots.length > 1 || (latestSnapshot && latestSnapshot.previous_score !== null && latestSnapshot.previous_score !== undefined);

  if (!hasMultipleSnapshots) {
    return (
      <Card hoverElevate className="border border-border/80 bg-surface">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-semibold tracking-wide">
                WHAT CHANGED?
              </CardTitle>
            </div>
            <Badge variant="neutral" size="sm">Baseline Analysis</Badge>
          </div>
          <CardDescription className="text-xs text-muted-foreground">
            Longitudinal score tracking across successive pipeline execution runs.
          </CardDescription>
        </CardHeader>
        <div className="p-4 pt-0 space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-surface-muted/30 border border-border/30">
            <Info className="w-4 h-4 text-primary/80 shrink-0" />
            <span>
              Initial Baseline Analysis — No previous analysis snapshot available. Longitudinal changes will be automatically cataloged upon subsequent pipeline ingestion runs.
            </span>
          </div>
          {latestSnapshot && (
            <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground pt-1">
              <span>Active Run: <span className="text-foreground">{latestSnapshot.run_id}</span></span>
              <span>• Dataset: <span className="text-foreground">{latestSnapshot.dataset_version}</span></span>
              <span>• Engine: <span className="text-foreground">{latestSnapshot.model_version}</span></span>
            </div>
          )}
        </div>
      </Card>
    );
  }

  // Calculate score delta
  const prevScore = latestSnapshot?.previous_score ?? previousSnapshot?.audit_priority_score;
  const currScore = latestSnapshot?.audit_priority_score ?? currentScore ?? 0;
  const delta = prevScore !== undefined && prevScore !== null ? currScore - prevScore : 0;

  return (
    <Card hoverElevate className="border border-border/80 bg-surface shadow-xs">
      <CardHeader className="pb-3 border-b border-border/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary">
              <History className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-bold text-foreground">
                  WHAT CHANGED? (ANALYSIS HISTORY)
                </CardTitle>
                <Badge variant={delta > 0 ? 'warning' : (delta < 0 ? 'success' : 'neutral')} size="sm">
                  {delta > 0 ? `+${delta.toFixed(1)} Priority Shift` : (delta < 0 ? `${delta.toFixed(1)} Priority Shift` : 'Score Unchanged')}
                </Badge>
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                Score movement and signal emergence compared across analytical runs.
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <div className="p-4 space-y-4">
        {/* Score Shift Hero */}
        <div className="p-3.5 rounded-lg bg-surface-muted/50 border border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="text-center">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">Previous</span>
              <span className="text-lg font-bold font-mono text-muted-foreground">
                {prevScore !== undefined && prevScore !== null ? prevScore.toFixed(0) : 'N/A'}
              </span>
            </div>

            <ArrowRight className="w-4 h-4 text-muted-foreground/60 shrink-0" />

            <div className="text-center">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">Current</span>
              <span className="text-lg font-bold font-mono text-foreground">
                {currScore.toFixed(0)}
              </span>
            </div>

            <div className="ml-2 pl-3 border-l border-border/60">
              <span className="text-xs font-semibold text-foreground block">
                {delta > 0 ? (
                  <span className="inline-flex items-center gap-1 text-amber-400">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Priority increased by {Math.abs(delta).toFixed(1)} pts
                  </span>
                ) : delta < 0 ? (
                  <span className="inline-flex items-center gap-1 text-emerald-400">
                    <TrendingDown className="w-3.5 h-3.5" />
                    Priority decreased by {Math.abs(delta).toFixed(1)} pts
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Minus className="w-3.5 h-3.5" />
                    Priority score unchanged
                  </span>
                )}
              </span>
              <span className="text-[11px] text-muted-foreground">
                Triggered by updated contractor concentration and price deflation metrics.
              </span>
            </div>
          </div>

          <div className="text-right text-[11px] font-mono text-muted-foreground">
            <div>Run: <span className="text-foreground">{latestSnapshot.run_id}</span></div>
            <div>Dataset: <span className="text-foreground">{latestSnapshot.dataset_version}</span></div>
          </div>
        </div>

        {/* Change Summary Rationale */}
        {latestSnapshot?.change_summary && (
          <div className="text-xs text-muted-foreground p-3 rounded-lg bg-surface-muted/30 border border-border/30">
            <span className="font-semibold text-foreground block mb-1">Diagnostic Change Rationale</span>
            <p className="leading-relaxed">{latestSnapshot.change_summary}</p>
          </div>
        )}

        {/* Snapshot Trail Table */}
        {snapshots.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-semibold text-foreground block">Analysis Snapshot Trail</span>
            <div className="overflow-x-auto rounded-lg border border-border/40">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-surface-muted/60 text-muted-foreground border-b border-border/40 font-sans text-[11px]">
                  <tr>
                    <th className="p-2 pl-3">Run ID</th>
                    <th className="p-2">Dataset Version</th>
                    <th className="p-2">Priority Score</th>
                    <th className="p-2">Priority Level</th>
                    <th className="p-2 pr-3">Recorded At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {snapshots.slice(0, 4).map((s, idx) => (
                    <tr key={s.run_id || idx} className="hover:bg-surface-muted/30">
                      <td className="p-2 pl-3 text-primary">{s.run_id}</td>
                      <td className="p-2 text-foreground">{s.dataset_version}</td>
                      <td className="p-2 font-bold text-foreground">{s.audit_priority_score.toFixed(1)}</td>
                      <td className="p-2">
                        <span className="font-sans text-[11px] font-medium text-muted-foreground">
                          {s.priority_level}
                        </span>
                      </td>
                      <td className="p-2 pr-3 font-sans text-muted-foreground text-[11px]">
                        {s.recorded_at ? new Date(s.recorded_at).toLocaleDateString() : 'Baseline'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

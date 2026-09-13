import React from 'react';
import { Card, CardHeader, CardTitle } from '../../../components/ui/Card';
import type { ProjectItem } from '../../../types/project';
import { Landmark, Calendar, FileText, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface ProjectFactsAndFinancialsProps {
  project: ProjectItem;
}

export const ProjectFactsAndFinancials: React.FC<ProjectFactsAndFinancialsProps> = ({ project }) => {
  const financial = project.financial;
  const timeline = project.timeline;

  const formatINR = (val?: number | null) => {
    if (val === undefined || val === null) return '—';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
    return `₹${val.toLocaleString()}`;
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Not recorded';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const utilizationPercent = financial?.sanctioned_amount
    ? Math.round(((financial.expenditure || 0) / financial.sanctioned_amount) * 100)
    : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* 1. Administrative Facts (5/12 on lg) */}
      <Card className="lg:col-span-5 flex flex-col justify-between border-border shadow-xs">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <span>Administrative Project Facts</span>
          </CardTitle>
        </CardHeader>

        <div className="p-4 space-y-3 text-xs divide-y divide-border/50">
          <div className="flex items-center justify-between pt-1">
            <span className="text-muted-foreground">Constituency</span>
            <span className="font-medium text-foreground">{project.constituency || '—'}</span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-muted-foreground">Member of Parliament</span>
            <span className="font-medium text-foreground text-right">{project.mp_name || '—'}</span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-muted-foreground">State / District</span>
            <span className="font-medium text-foreground text-right">
              {project.state || '—'} • {project.district || '—'}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-muted-foreground">Block / Village</span>
            <span className="font-medium text-foreground text-right">
              {[project.location?.block, project.location?.village].filter(Boolean).join(' • ') || '—'}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-muted-foreground">Primary Sector</span>
            <span className="font-medium text-foreground">{project.sector || '—'}</span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-muted-foreground">Work Status</span>
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
              <span>{project.status || 'Active'}</span>
            </span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-muted-foreground">Dataset Provenance</span>
            <span className="font-mono text-[11px] text-muted-foreground bg-surface-muted px-1.5 py-0.5 rounded border border-border">
              {project.dataset_version || 'DEMO-SYNTHETIC-v1'}
            </span>
          </div>
        </div>
      </Card>

      {/* 2. Financial Overview & Timeline (7/12 on lg) */}
      <div className="lg:col-span-7 space-y-6">
        {/* Financial Card */}
        <Card className="border-border shadow-xs">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Landmark className="w-4 h-4 text-primary" />
                <span>Financial Analysis</span>
              </CardTitle>
              <span className="text-xs font-mono font-semibold text-primary">
                {utilizationPercent}% Fund Utilization
              </span>
            </div>
          </CardHeader>

          <div className="p-4 space-y-3">
            {/* Progress bar */}
            <div className="h-2 w-full bg-surface-highest rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-3 pt-1 text-xs">
              <div className="p-2.5 rounded-lg bg-surface-muted/50 border border-border/60">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                  Sanctioned
                </span>
                <span className="font-mono text-sm font-bold text-foreground mt-0.5 block">
                  {formatINR(financial?.sanctioned_amount)}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-surface-muted/50 border border-border/60">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                  Estimated Cost
                </span>
                <span className="font-mono text-sm font-bold text-foreground mt-0.5 block">
                  {formatINR(financial?.estimated_cost)}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-surface-muted/50 border border-border/60">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                  Expenditure
                </span>
                <span className="font-mono text-sm font-bold text-foreground mt-0.5 block">
                  {formatINR(financial?.expenditure)}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Timeline Card */}
        <Card className="border-border shadow-xs">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span>Execution Timeline & Cadence</span>
              </CardTitle>
              {timeline?.duration_days !== undefined && timeline?.duration_days !== null && (
                <span className="text-xs font-mono text-muted-foreground">
                  Duration: {timeline.duration_days} days
                </span>
              )}
            </div>
          </CardHeader>

          <div className="p-4 space-y-4">
            {/* Timeline Milestones */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-surface-muted/40 border border-border/60 space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                  Sanction Date
                </span>
                <span className="font-mono text-xs font-medium text-foreground block">
                  {formatDate(timeline?.sanction_date)}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-surface-muted/40 border border-border/60 space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                  Commencement
                </span>
                <span className="font-mono text-xs font-medium text-foreground block">
                  {formatDate(timeline?.start_date)}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-surface-muted/40 border border-border/60 space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                  Completion
                </span>
                <span className="font-mono text-xs font-medium text-foreground block">
                  {formatDate(timeline?.completion_date)}
                </span>
              </div>
            </div>

            {/* Cadence assessment */}
            <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground border-t border-border/50">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Execution Schedule:</span>
                <span className="text-foreground font-medium">
                  {timeline?.delay_days ? `${timeline.delay_days} days recorded delay` : 'Completed within scheduled window'}
                </span>
              </div>

              {timeline?.delay_days && timeline.delay_days > 0 ? (
                <span className="text-warning flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3" />
                  Schedule variance observed
                </span>
              ) : null}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

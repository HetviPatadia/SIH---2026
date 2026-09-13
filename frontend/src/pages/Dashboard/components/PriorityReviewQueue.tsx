import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription } from '../../../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { AuditPriorityIndicator } from '../../../components/audit/AuditPriorityIndicator';
import { StatusBadge } from '../../../components/audit/StatusBadge';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { ArrowRight, ExternalLink, RefreshCw, AlertCircle, AlertTriangle } from 'lucide-react';
import type { ProjectItem } from '../../../types/project';
import { useInvestigation } from '../../../context/InvestigationContext';

interface PriorityReviewQueueProps {
  projects: ProjectItem[];
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
  activeFilter?: 'ALL' | 'HIGH_PRIORITY' | 'CRITICAL' | 'HIGH';
  onFilterChange?: (filter: 'ALL' | 'HIGH_PRIORITY' | 'CRITICAL' | 'HIGH') => void;
}

export const PriorityReviewQueue: React.FC<PriorityReviewQueueProps> = ({
  projects,
  loading,
  error,
  onRetry,
  activeFilter = 'HIGH_PRIORITY',
  onFilterChange,
}) => {
  const { setActiveProject } = useInvestigation();

  const reviewsUrl = activeFilter === 'CRITICAL' 
    ? '/reviews?priority=CRITICAL' 
    : activeFilter === 'HIGH' 
    ? '/reviews?priority=HIGH' 
    : activeFilter === 'HIGH_PRIORITY' 
    ? '/reviews?priority=HIGH,CRITICAL' 
    : '/reviews';

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border gap-2">
        <div>
          <CardTitle className="text-sm font-semibold text-foreground flex flex-wrap items-center gap-2">
            <span>Priority Review Queue</span>
            {!loading && (
              <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border font-bold flex items-center gap-1 ${
                activeFilter === 'CRITICAL' || activeFilter === 'HIGH_PRIORITY'
                  ? 'bg-danger-surface text-danger border-danger/30'
                  : activeFilter === 'HIGH'
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                  : 'bg-muted text-foreground border-border'
              }`}>
                {(activeFilter === 'HIGH_PRIORITY' || activeFilter === 'CRITICAL') && (
                  <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />
                )}
                <span>
                  {activeFilter === 'CRITICAL' 
                    ? 'Critical Works' 
                    : activeFilter === 'HIGH' 
                    ? 'High Priority Works' 
                    : activeFilter === 'HIGH_PRIORITY' 
                    ? 'High-Priority Reviews' 
                    : 'All Monitored Works'} ({projects.length})
                </span>
              </span>
            )}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            {activeFilter === 'HIGH_PRIORITY' || activeFilter === 'CRITICAL' || activeFilter === 'HIGH'
              ? 'Showing works requiring urgent audit verification based on multi-modal anomaly scoring'
              : 'Showing all monitored project works sorted by audit priority'}
          </CardDescription>
        </div>

        <Link to={reviewsUrl}>
          <Button variant="ghost" size="sm" className="text-xs text-primary hover:text-primary-hover gap-1">
            <span>Open in Full Review Queue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </CardHeader>

      {/* Filter Tabs Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-2 bg-surface-muted/40 border-b border-border text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mr-1">
            Filter View:
          </span>

          <button
            type="button"
            onClick={() => onFilterChange?.('HIGH_PRIORITY')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeFilter === 'HIGH_PRIORITY'
                ? 'bg-rose-600 text-white shadow-xs font-bold'
                : 'bg-surface border border-border text-muted-foreground hover:text-foreground hover:bg-surface-muted'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>High-Priority &amp; Critical</span>
          </button>

          <button
            type="button"
            onClick={() => onFilterChange?.('CRITICAL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
              activeFilter === 'CRITICAL'
                ? 'bg-rose-700 text-white shadow-xs font-bold'
                : 'bg-surface border border-border text-muted-foreground hover:text-foreground hover:bg-surface-muted'
            }`}
          >
            <span>Critical Only</span>
          </button>

          <button
            type="button"
            onClick={() => onFilterChange?.('HIGH')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
              activeFilter === 'HIGH'
                ? 'bg-amber-600 text-white shadow-xs font-bold'
                : 'bg-surface border border-border text-muted-foreground hover:text-foreground hover:bg-surface-muted'
            }`}
          >
            <span>High Only</span>
          </button>

          <button
            type="button"
            onClick={() => onFilterChange?.('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
              activeFilter === 'ALL'
                ? 'bg-primary text-white shadow-xs font-bold'
                : 'bg-surface border border-border text-muted-foreground hover:text-foreground hover:bg-surface-muted'
            }`}
          >
            <span>All Works</span>
          </button>
        </div>

        {activeFilter !== 'HIGH_PRIORITY' && (
          <button
            type="button"
            onClick={() => onFilterChange?.('HIGH_PRIORITY')}
            className="text-[11px] text-danger hover:underline font-semibold cursor-pointer"
          >
            Back to High-Priority
          </button>
        )}
      </div>

      <div className="flex-1 overflow-x-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 py-2 border-b border-border/50 animate-pulse">
                <div className="h-4 w-28 bg-surface-highest rounded" />
                <div className="h-4 w-40 bg-surface-highest rounded flex-1" />
                <div className="h-4 w-20 bg-surface-highest rounded" />
                <div className="h-4 w-24 bg-surface-highest rounded" />
                <div className="h-4 w-16 bg-surface-highest rounded" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center flex flex-col items-center justify-center gap-3">
            <AlertCircle className="w-8 h-8 text-danger/80" />
            <div className="space-y-1">
              <p className="text-xs font-semibold text-foreground">Failed to load priority review queue</p>
              <p className="text-xs text-muted-foreground max-w-sm">{error}</p>
            </div>
            {onRetry && (
              <Button size="sm" variant="outline" onClick={onRetry} leftIcon={<RefreshCw className="w-3 h-3" />}>
                Retry
              </Button>
            )}
          </div>
        ) : projects.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <p className="text-xs font-medium text-foreground">No high-priority projects currently require review.</p>
            <p className="text-[11px] text-muted-foreground">
              All active works are currently within baseline thresholds or marked as verified.
            </p>
          </div>
        ) : (
          <Table containerClassName="border-0 rounded-none bg-transparent">
            <TableHeader>
              <TableRow className="border-b border-border">
                <TableHead className="w-48">Project / Work</TableHead>
                <TableHead className="w-36">Location</TableHead>
                <TableHead className="w-36">Audit Priority</TableHead>
                <TableHead className="w-44">Primary Signals</TableHead>
                <TableHead className="w-28">Review Status</TableHead>
                <TableHead className="w-20 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => {
                const primarySignal = project.primary_signals?.[0];
                const remainingSignalsCount = (project.primary_signals?.length ?? 0) - 1;
                const locationText = [
                  project.location?.village || project.location?.block,
                  project.district,
                  project.state,
                ]
                  .filter(Boolean)
                  .join(', ');

                return (
                  <TableRow 
                    key={project.project_id} 
                    className="table-row-hover transition-colors group cursor-pointer"
                    onClick={() => {
                      setActiveProject(project.project_id, project.description);
                    }}
                  >
                    <TableCell className="align-top py-3">
                      <div className="space-y-1">
                        <Link
                          to={`/projects/${project.project_id}`}
                          onClick={() => setActiveProject(project.project_id, project.description)}
                          className="font-mono text-xs font-semibold text-foreground hover:text-primary transition-colors inline-flex items-center gap-1 group"
                        >
                          <span>{project.project_id}</span>
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                        </Link>
                        <p className="text-[11px] text-muted-foreground line-clamp-1" title={project.description}>
                          {project.description || 'Description not recorded'}
                        </p>
                        {project.sector && (
                          <span className="inline-block text-[10px] text-muted-foreground/80 font-medium">
                            {project.sector}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="align-top py-3">
                      <div className="space-y-0.5">
                        <div className="text-xs text-foreground font-medium truncate" title={locationText}>
                          {project.district || 'Unassigned'}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {project.state || ''}
                          {project.location?.block ? ` • ${project.location.block}` : ''}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="align-top py-3">
                      <AuditPriorityIndicator
                        score={project.audit_priority ?? project.risk_score?.unified_score}
                        level={project.priority_level ?? project.risk_score?.priority_level}
                        showBar={true}
                        size="sm"
                      />
                    </TableCell>

                    <TableCell className="align-top py-3">
                      {primarySignal ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="warning" size="sm" className="truncate max-w-[150px]">
                            {primarySignal}
                          </Badge>
                          {remainingSignalsCount > 0 && (
                            <Badge
                              variant="neutral"
                              size="sm"
                              title={project.primary_signals?.slice(1).join(', ')}
                            >
                              +{remainingSignalsCount}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">Routine Monitoring</span>
                      )}
                    </TableCell>

                    <TableCell className="align-top py-3">
                      <StatusBadge status={project.review_status || 'NEW'} size="sm" />
                    </TableCell>

                    <TableCell className="align-top py-3 text-right">
                      <Link 
                        to={`/projects/${project.project_id}`}
                        onClick={() => setActiveProject(project.project_id, project.description)}
                      >
                        <Button variant="outline" size="sm" className="text-[11px] h-7 px-2.5 hover:border-primary">
                          Inspect
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="px-4 py-2.5 border-t border-border bg-surface-muted/30 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Showing prioritized sample for operational audit triage</span>
        <Link to="/reviews" className="text-primary hover:underline font-medium">
          Full Review Workspace →
        </Link>
      </div>
    </Card>
  );
};

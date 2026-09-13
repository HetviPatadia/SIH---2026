import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { AuditPriorityIndicator } from '../../../components/audit/AuditPriorityIndicator';
import { StatusBadge } from '../../../components/audit/StatusBadge';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import type { ProjectItem } from '../../../types/project';
import { ArrowRight, Eye, ChevronLeft, ChevronRight, AlertCircle, Inbox, User } from 'lucide-react';
import { useInvestigation } from '../../../context/InvestigationContext';

interface ReviewTableProps {
  projects: ProjectItem[];
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
  onSelectProject: (project: ProjectItem) => void;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newSize: number) => void;
}

export const ReviewTable: React.FC<ReviewTableProps> = ({
  projects,
  loading,
  error,
  onRetry,
  onSelectProject,
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}) => {
  const { setActiveProject } = useInvestigation();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, total);

  if (error) {
    return (
      <Card className="p-8 text-center flex flex-col items-center justify-center gap-3">
        <AlertCircle className="w-8 h-8 text-danger/80" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">Unable to load audit review queue</p>
          <p className="text-xs text-muted-foreground max-w-sm">{error}</p>
        </div>
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry} className="text-xs">
            Retry Loading
          </Button>
        )}
      </Card>
    );
  }

  return (
    <Card className="flex flex-col shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <Table containerClassName="border-0 rounded-none bg-transparent">
          <TableHeader>
            <TableRow className="border-b border-border bg-surface-muted/60">
              <TableHead className="w-56">Project / Identifier</TableHead>
              <TableHead className="w-36">Location</TableHead>
              <TableHead className="w-36">Audit Priority</TableHead>
              <TableHead className="w-52">Primary Signal</TableHead>
              <TableHead className="w-36">Review Status</TableHead>
              <TableHead className="w-28">Last Updated</TableHead>
              <TableHead className="w-32 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              // Loading Skeleton Rows
              Array.from({ length: pageSize > 10 ? 10 : pageSize }).map((_, i) => (
                <TableRow key={i} className="animate-pulse border-b border-border/40">
                  <TableCell className="py-3.5">
                    <div className="space-y-1.5">
                      <div className="h-3.5 w-32 bg-surface-highest rounded" />
                      <div className="h-3 w-48 bg-surface-highest rounded" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="h-3 w-24 bg-surface-highest rounded" />
                      <div className="h-2.5 w-16 bg-surface-highest rounded" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="h-5 w-28 bg-surface-highest rounded-full" />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="h-4 w-32 bg-surface-highest rounded" />
                      <div className="h-2.5 w-44 bg-surface-highest rounded" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="h-5 w-24 bg-surface-highest rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-3 w-20 bg-surface-highest rounded" />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="h-7 w-20 bg-surface-highest rounded ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : projects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Inbox className="w-8 h-8 text-muted-foreground/40" />
                    <p className="text-xs font-medium text-foreground">
                      No projects found matching the selected filter criteria.
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Try broadening your search query or resetting active priority/status filters.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              projects.map((project) => {
                const primarySignal = project.primary_signals?.[0];
                const otherSignalsCount = (project.primary_signals?.length ?? 0) - 1;
                const score = project.audit_priority ?? project.risk_score?.unified_score;
                const level = project.priority_level ?? project.risk_score?.priority_level;
                const updatedDate = project.updated_at
                  ? new Date(project.updated_at).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '—';

                return (
                  <TableRow
                    key={project.project_id}
                    className="table-row-hover transition-colors group cursor-pointer"
                    onClick={() => {
                      setActiveProject(project.project_id, project.description);
                      onSelectProject(project);
                    }}
                  >
                    {/* Project & Identifier */}
                    <TableCell className="align-top py-3">
                      <div className="space-y-1">
                        <span className="font-mono text-xs font-bold text-foreground group-hover:text-primary transition-colors block">
                          {project.project_id}
                        </span>
                        <p
                          className="text-[11px] text-muted-foreground line-clamp-1 max-w-[220px]"
                          title={project.description}
                        >
                          {project.description || 'Description not recorded'}
                        </p>
                        {project.sector && (
                          <span className="inline-block text-[10px] text-muted-foreground/80 font-medium truncate max-w-[200px]">
                            {project.sector}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Location */}
                    <TableCell className="align-top py-3">
                      <div className="space-y-0.5">
                        <div className="text-xs text-foreground font-medium truncate max-w-[130px]" title={project.district}>
                          {project.district || 'Unassigned'}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate max-w-[130px]">
                          {project.state || ''}
                          {project.location?.block ? ` • ${project.location.block}` : ''}
                        </div>
                      </div>
                    </TableCell>

                    {/* Audit Priority */}
                    <TableCell className="align-top py-3">
                      <AuditPriorityIndicator score={score} level={level} showBar={true} size="sm" />
                    </TableCell>

                    {/* Primary Signal & Intelligence Domain Pills */}
                    <TableCell className="align-top py-3">
                      <div className="space-y-1.5">
                        {primarySignal ? (
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-1">
                              <Badge variant="warning" size="sm" className="truncate max-w-[160px]">
                                {primarySignal}
                              </Badge>
                              {otherSignalsCount > 0 && (
                                <Badge
                                  variant="neutral"
                                  size="sm"
                                  title={project.primary_signals?.slice(1).join(', ')}
                                >
                                  +{otherSignalsCount}
                                </Badge>
                              )}
                            </div>

                            {/* Compact Domain Intelligence Pills */}
                            <div className="flex flex-wrap items-center gap-1 pt-0.5">
                              {project.primary_signals?.some((s) => /cost|financial/i.test(s)) && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                  Cost
                                </span>
                              )}
                              {project.primary_signals?.some((s) => /contractor|nexus/i.test(s)) && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                  Contractor
                                </span>
                              )}
                              {project.primary_signals?.some((s) => /description|semantic|text/i.test(s)) && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                                  Semantic
                                </span>
                              )}
                              {project.primary_signals?.some((s) => /evidence|photograph|image/i.test(s)) && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  Evidence
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">Baseline Distribution</span>
                        )}
                        {project.why_flagged && (
                          <p
                            className="text-[10px] text-muted-foreground/80 line-clamp-1 max-w-[220px]"
                            title={project.why_flagged}
                          >
                            {project.why_flagged}
                          </p>
                        )}
                      </div>
                    </TableCell>

                    {/* Review Status */}
                    <TableCell className="align-top py-3">
                      <div className="space-y-1">
                        <StatusBadge status={project.review_status || 'NEW'} size="sm" />
                        {project.assigned_to && (
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground truncate max-w-[120px]" title={project.assigned_to}>
                            <User className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">{project.assigned_to}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Last Updated */}
                    <TableCell className="align-top py-3">
                      <span className="text-[11px] font-mono text-muted-foreground whitespace-nowrap">
                        {updatedDate}
                      </span>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="align-top py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setActiveProject(project.project_id, project.description);
                            onSelectProject(project);
                          }}
                          className="h-7 px-2 text-muted-foreground hover:text-foreground"
                          title="Quick preview"
                          aria-label={`Preview ${project.project_id}`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Link 
                          to={`/projects/${project.project_id}`}
                          onClick={() => setActiveProject(project.project_id, project.description)}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7 px-2.5 hover:border-primary gap-1"
                          >
                            <span>Review</span>
                            <ArrowRight className="w-3 h-3" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      <div className="px-4 py-3 border-t border-border bg-surface-muted/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span>
            Showing <strong className="text-foreground font-mono">{startIndex}</strong>–
            <strong className="text-foreground font-mono">{endIndex}</strong> of{' '}
            <strong className="text-foreground font-mono">{total.toLocaleString()}</strong> projects
          </span>

          <div className="flex items-center gap-1.5 pl-3 border-l border-border">
            <span className="text-[11px]">Per page:</span>
            <Select
              value={String(pageSize)}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-7 text-xs w-16 py-0 px-2"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => onPageChange(page - 1)}
            className="h-7 px-2"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>

          <span className="text-xs px-2">
            Page <strong className="text-foreground font-mono">{page}</strong> of{' '}
            <strong className="text-foreground font-mono">{totalPages}</strong>
          </span>

          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => onPageChange(page + 1)}
            className="h-7 px-2"
            aria-label="Next page"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

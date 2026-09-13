import React from 'react';
import { Drawer } from '../../../components/ui/Drawer';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { AuditPriorityIndicator } from '../../../components/audit/AuditPriorityIndicator';
import { StatusBadge } from '../../../components/audit/StatusBadge';
import type { ProjectItem } from '../../../types/project';
import { ArrowRight, MapPin, Building, User, Calendar, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ReviewDetailDrawerProps {
  project: ProjectItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReviewDetailDrawer: React.FC<ReviewDetailDrawerProps> = ({
  project,
  isOpen,
  onClose,
}) => {
  if (!project) return null;

  const score = project.audit_priority ?? project.risk_score?.unified_score;
  const level = project.priority_level ?? project.risk_score?.priority_level;

  const formatINR = (val?: number) => {
    if (!val) return '—';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
    return `₹${val.toLocaleString()}`;
  };

  const utilization = project.financial?.sanctioned_amount
    ? Math.round(((project.financial?.expenditure || 0) / project.financial.sanctioned_amount) * 100)
    : 0;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Project Audit Summary"
      description="Quick preview of flagged signals and review status prior to detailed dossier."
      widthClass="max-w-lg w-full"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Close Preview
          </Button>
          <Link to={`/projects/${project.project_id}`}>
            <Button size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />} className="text-xs">
              Open Full Investigation
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-5 text-xs text-foreground">
        {/* Project Header Box */}
        <div className="p-3.5 rounded-lg border border-border bg-surface-muted/40 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-sm font-bold text-foreground tracking-tight">
              {project.project_id}
            </span>
            <AuditPriorityIndicator score={score} level={level} size="sm" />
          </div>

          <p className="text-xs text-foreground font-medium leading-relaxed">
            {project.description || 'Description not recorded in benchmark dataset.'}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-muted-foreground border-t border-border/50">
            <div className="flex items-center gap-1">
              <Building className="w-3 h-3 text-muted-foreground" />
              <span>{project.sector || 'Unassigned Sector'}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-muted-foreground" />
              <span>
                {[project.location?.village, project.district, project.state].filter(Boolean).join(', ')}
              </span>
            </div>
          </div>
        </div>

        {/* Priority & Why Flagged */}
        <div className="space-y-2">
          <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-warning" />
            <span>Why This Project Is Flagged</span>
          </h4>
          <div className="p-3 rounded-lg border border-warning/30 bg-warning-surface/30 space-y-2 text-xs">
            <p className="text-foreground leading-relaxed">
              {project.why_flagged || 'Routine monitoring — metrics align with expected regional distribution.'}
            </p>

            {project.primary_signals && project.primary_signals.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {project.primary_signals.map((sig, idx) => (
                  <Badge key={idx} variant="warning" size="sm">
                    {sig}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Review Status & Assignee */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg border border-border bg-surface space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
              Review Status
            </span>
            <StatusBadge status={project.review_status || 'NEW'} />
          </div>

          <div className="p-3 rounded-lg border border-border bg-surface space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
              Assigned Investigator
            </span>
            <div className="flex items-center gap-1.5 text-xs text-foreground font-medium truncate">
              <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{project.assigned_to || 'Unassigned (Queue)'}</span>
            </div>
          </div>
        </div>

        {/* Financial Snapshot */}
        <div className="p-3.5 rounded-lg border border-border bg-surface space-y-2.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-foreground uppercase tracking-wider text-[10px]">
              Financial Overview
            </span>
            <span className="font-mono text-muted-foreground">{utilization}% Utilized</span>
          </div>

          <div className="h-1.5 w-full bg-surface-highest rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${Math.min(utilization, 100)}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <div>
              <span className="text-muted-foreground text-[10px] block">Sanctioned</span>
              <span className="font-mono font-semibold text-foreground">
                {formatINR(project.financial?.sanctioned_amount)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground text-[10px] block">Expenditure</span>
              <span className="font-mono font-semibold text-foreground">
                {formatINR(project.financial?.expenditure)}
              </span>
            </div>
          </div>
        </div>

        {/* Case & Timeline Reference */}
        <div className="p-3 rounded-lg border border-border bg-surface-muted/30 text-[11px] space-y-1 text-muted-foreground">
          {project.case_id && (
            <div className="flex items-center justify-between">
              <span>Case Reference:</span>
              <span className="font-mono text-foreground">{project.case_id}</span>
            </div>
          )}
          {project.updated_at && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>Last Updated:</span>
              </span>
              <span className="font-mono text-foreground">
                {new Date(project.updated_at).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
};

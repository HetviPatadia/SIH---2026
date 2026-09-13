import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { AuditPriorityIndicator } from '../../../components/audit/AuditPriorityIndicator';
import { StatusBadge } from '../../../components/audit/StatusBadge';
import { Select } from '../../../components/ui/Select';
import type { ProjectItem } from '../../../types/project';
import { ArrowLeft, RefreshCw, CheckCircle2, ShieldAlert, Building, MapPin } from 'lucide-react';

interface InvestigationHeaderProps {
  project: ProjectItem;
  onStatusUpdate: (newStatus: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  refreshing: boolean;
}

export const InvestigationHeader: React.FC<InvestigationHeaderProps> = ({
  project,
  onStatusUpdate,
  onRefresh,
  refreshing,
}) => {
  const [updating, setUpdating] = useState<boolean>(false);
  const currentStatus = project.review_status || 'NEW';

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextStatus = e.target.value;
    if (nextStatus && nextStatus !== currentStatus) {
      setUpdating(true);
      try {
        await onStatusUpdate(nextStatus);
      } finally {
        setUpdating(false);
      }
    }
  };

  const score = project.audit_priority ?? project.risk_score?.unified_score;
  const level = project.priority_level ?? project.risk_score?.priority_level;

  return (
    <div className="space-y-4">
      {/* Top action row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/reviews">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            className="text-xs text-muted-foreground hover:text-foreground -ml-2"
          >
            Back to Reviews
          </Button>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={refreshing}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />}
            className="text-xs"
          >
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Main Dossier Header Banner */}
      <div className="rounded-xl border border-border bg-surface p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Left: Project Identifiers & Metadata */}
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-base font-bold text-foreground tracking-tight bg-surface-muted px-2.5 py-0.5 rounded border border-border">
                {project.project_id}
              </span>
              {project.status && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-surface-highest text-muted-foreground border border-border">
                  {project.status}
                </span>
              )}
              {project.dataset_version && (
                <span className="text-[10px] font-mono text-muted-foreground bg-surface-highest/60 px-2 py-0.5 rounded">
                  {project.dataset_version}
                </span>
              )}
            </div>

            <h1 className="text-lg sm:text-xl font-bold text-foreground leading-snug">
              {project.description || 'Description not recorded in benchmark registry'}
            </h1>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground pt-1">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span>
                  {[project.location?.village, project.district, project.state].filter(Boolean).join(', ')}
                </span>
              </div>
              {project.sector && (
                <div className="flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span>{project.sector}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Audit Priority & Status Adjudication */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-border">
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                Audit Priority:
              </span>
              <AuditPriorityIndicator score={score} level={level} size="md" />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Review Status:</span>
              <StatusBadge status={currentStatus} size="md" />

              {/* Status transition dropdown */}
              <div className="w-40 ml-1">
                <Select
                  value={currentStatus}
                  onChange={handleStatusChange}
                  disabled={updating}
                  className="h-8 text-xs bg-surface"
                >
                  <option value="NEW">New</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="VERIFICATION_REQUIRED">Verification Required</option>
                  <option value="ESCALATED">Escalated</option>
                  <option value="VERIFIED">Verified</option>
                  <option value="DISMISSED">Dismissed</option>
                  <option value="CLOSED">Closed</option>
                </Select>
              </div>
            </div>

            {updating && (
              <span className="text-[10px] text-primary flex items-center gap-1 animate-pulse font-mono">
                <CheckCircle2 className="w-3 h-3" />
                Updating audit case status...
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Human-in-the-Loop Institutional Advisory */}
      <div className="rounded-lg border border-border bg-surface-muted/40 p-3 flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 text-warning shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong className="text-foreground font-semibold">Administrative Decision-Support Advisory:</strong> This
          dossier presents multi-modal pattern indicators to assist physical audit prioritization. High Audit
          Priority reflects anomaly concentration across spatial, procurement, and asset domains and does not
          constitute proof of wrongdoing.
        </p>
      </div>
    </div>
  );
};

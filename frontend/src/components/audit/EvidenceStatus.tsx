import React from 'react';
import { cn } from '../../lib/utils';
import { CheckCircle2, AlertCircle, FileX, Clock } from 'lucide-react';
import type { EvidenceStatusTier } from '../../types/evidence';

export interface EvidenceStatusProps {
  status: EvidenceStatusTier | string;
  showIcon?: boolean;
  className?: string;
}

export const EvidenceStatus: React.FC<EvidenceStatusProps> = ({
  status,
  showIcon = true,
  className,
}) => {
  const normalized = status.toUpperCase();

  const getInfo = () => {
    switch (normalized) {
      case 'VERIFIED':
        return {
          label: 'Evidence Verified',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-success" />,
          style: 'text-success bg-success-surface border-success/30',
        };
      case 'POTENTIAL_REUSE':
        return {
          label: 'Potential Reuse',
          icon: <AlertCircle className="w-3.5 h-3.5 text-warning" />,
          style: 'text-warning bg-warning-surface border-warning/30',
        };
      case 'LOCATION_INCONSISTENCY':
        return {
          label: 'Location Inconsistent',
          icon: <AlertCircle className="w-3.5 h-3.5 text-danger" />,
          style: 'text-danger bg-danger-surface border-danger/30',
        };
      case 'TEMPORAL_INCONSISTENCY':
        return {
          label: 'Temporal Inconsistent',
          icon: <AlertCircle className="w-3.5 h-3.5 text-warning" />,
          style: 'text-warning bg-warning-surface border-warning/30',
        };
      case 'INSUFFICIENT_METADATA':
        return {
          label: 'Insufficient Metadata',
          icon: <FileX className="w-3.5 h-3.5 text-muted-foreground" />,
          style: 'text-muted-foreground bg-surface-highest border-border',
        };
      case 'REVIEW_REQUIRED':
      case 'NEEDS_REVIEW':
        return {
          label: 'Requires Verification',
          icon: <AlertCircle className="w-3.5 h-3.5 text-warning" />,
          style: 'text-warning bg-warning-surface border-warning/30',
        };
      case 'INCONSISTENT':
      case 'EXACT_REUSE':
        return {
          label: 'Inconsistency Detected',
          icon: <AlertCircle className="w-3.5 h-3.5 text-danger" />,
          style: 'text-danger bg-danger-surface border-danger/30',
        };
      case 'UNAVAILABLE':
      case 'MISSING':
        return {
          label: 'Evidence Unavailable',
          icon: <FileX className="w-3.5 h-3.5 text-muted-foreground" />,
          style: 'text-muted-foreground bg-surface-highest border-border',
        };
      case 'PENDING':
      default:
        return {
          label: 'Pending Ingestion',
          icon: <Clock className="w-3.5 h-3.5 text-info" />,
          style: 'text-info bg-info-surface border-info/30',
        };
    }
  };

  const info = getInfo();

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-medium font-sans select-none',
        info.style,
        className
      )}
    >
      {showIcon && info.icon}
      <span>{info.label}</span>
    </span>
  );
};

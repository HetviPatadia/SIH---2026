import React from 'react';
import { cn } from '../../lib/utils';
import type { InvestigationStatus } from '../../types/investigation';

export interface StatusBadgeProps {
  status: InvestigationStatus | string;
  size?: 'sm' | 'md';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  className,
}) => {
  const normalized = status.toUpperCase();

  const getStyle = (s: string) => {
    switch (s) {
      case 'VERIFIED':
      case 'COMPLETED':
      case 'CLOSED':
        return 'bg-success-surface text-success border-success/30';
      case 'UNDER_REVIEW':
      case 'IN_PROGRESS':
        return 'bg-info-surface text-info border-info/30';
      case 'VERIFICATION_REQUIRED':
      case 'NEEDS_REVIEW':
      case 'HIGH_PRIORITY':
        return 'bg-warning-surface text-warning border-warning/30';
      case 'ESCALATED':
      case 'CRITICAL':
        return 'bg-danger-surface text-danger border-danger/30';
      case 'DISMISSED':
      case 'INSUFFICIENT_DATA':
      case 'UNAVAILABLE':
        return 'bg-surface-highest text-muted-foreground border-border';
      default:
        return 'bg-surface-highest text-foreground border-border';
    }
  };

  const formatLabel = (s: string) => {
    return s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-0.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border font-sans font-medium select-none whitespace-nowrap leading-tight',
        getStyle(normalized),
        sizeClasses[size],
        className
      )}
    >
      {formatLabel(status)}
    </span>
  );
};

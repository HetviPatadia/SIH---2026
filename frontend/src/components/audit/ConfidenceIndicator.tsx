import React from 'react';
import { cn } from '../../lib/utils';
import type { EvidenceConfidenceTier } from '../../types/evidence';

export interface ConfidenceIndicatorProps {
  score?: number | null;
  tier?: EvidenceConfidenceTier;
  className?: string;
}

export const ConfidenceIndicator: React.FC<ConfidenceIndicatorProps> = ({
  score,
  tier,
  className,
}) => {
  const resolvedTier: EvidenceConfidenceTier = React.useMemo(() => {
    if (tier) return tier;
    if (score !== undefined && score !== null) {
      if (score >= 75) return 'HIGH';
      if (score >= 50) return 'MEDIUM';
      if (score >= 25) return 'LOW';
      return 'INSUFFICIENT';
    }
    return 'INSUFFICIENT';
  }, [tier, score]);

  const config = {
    HIGH: {
      label: 'High Confidence',
      badgeClass: 'text-success bg-success-surface border-success/30',
    },
    MEDIUM: {
      label: 'Moderate Confidence',
      badgeClass: 'text-warning bg-warning-surface border-warning/30',
    },
    LOW: {
      label: 'Low Confidence',
      badgeClass: 'text-muted-foreground bg-surface-highest border-border',
    },
    INSUFFICIENT: {
      label: 'Insufficient Evidence',
      badgeClass: 'text-muted-foreground bg-surface-highest border-border italic',
    },
  };

  const current = config[resolvedTier];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-xs font-medium font-sans',
        current.badgeClass,
        className
      )}
      title="Evidence Confidence reflects reliability, completeness, and freshness of attached physical proof."
    >
      {score !== undefined && score !== null && (
        <span className="font-mono font-semibold">{Math.round(score)}%</span>
      )}
      <span>{current.label}</span>
    </span>
  );
};

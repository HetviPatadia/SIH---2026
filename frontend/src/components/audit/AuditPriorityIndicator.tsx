import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import type { AuditPriorityLevel } from '../../types/project';

export interface AuditPriorityIndicatorProps {
  score?: number | null;
  level?: AuditPriorityLevel;
  showBar?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showTooltip?: boolean;
}

export const AuditPriorityIndicator: React.FC<AuditPriorityIndicatorProps> = ({
  score,
  level,
  showBar = false,
  size = 'md',
  className,
  showTooltip = true,
}) => {
  const [animatedWidth, setAnimatedWidth] = useState(0);

  // Infer level from score if score provided without explicit level
  const resolvedLevel: AuditPriorityLevel = React.useMemo(() => {
    if (level) return level;
    if (score !== undefined && score !== null) {
      if (score >= 80) return 'CRITICAL';
      if (score >= 60) return 'HIGH';
      if (score >= 30) return 'MEDIUM';
      return 'LOW';
    }
    return 'LOW';
  }, [level, score]);

  // Animate progress bar once when score appears
  useEffect(() => {
    if (score !== undefined && score !== null) {
      const target = Math.min(Math.max(score, 0), 100);
      const timer = setTimeout(() => {
        setAnimatedWidth(target);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [score]);

  const config = {
    LOW: {
      label: 'Low Priority',
      badgeClass: 'bg-surface-muted text-muted-foreground border-border',
      barClass: 'bg-muted-foreground',
      dotClass: 'bg-slate-400',
    },
    MEDIUM: {
      label: 'Medium Priority',
      badgeClass: 'bg-primary-muted/20 text-primary border-primary/30',
      barClass: 'bg-primary',
      dotClass: 'bg-primary',
    },
    HIGH: {
      label: 'High Priority',
      badgeClass: 'bg-warning-surface text-warning border-warning/40 font-semibold',
      barClass: 'bg-warning',
      dotClass: 'bg-warning',
    },
    CRITICAL: {
      label: 'Critical Review',
      badgeClass: 'bg-danger-surface text-danger border-danger/40 font-semibold',
      barClass: 'bg-danger',
      dotClass: 'bg-danger',
    },
  };

  const current = config[resolvedLevel];

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  const tooltipText = score !== undefined && score !== null
    ? `Audit Priority: ${Math.round(score)}/100 (${current.label}) — Automated review prioritization signal for human auditors.`
    : `Audit Priority: ${current.label}`;

  return (
    <div 
      className={cn('inline-flex flex-col gap-1 select-none', className)}
      title={showTooltip ? tooltipText : undefined}
    >
      <div
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border leading-none font-sans whitespace-nowrap transition-colors',
          current.badgeClass,
          sizeClasses[size]
        )}
      >
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', current.dotClass)} />
        {score !== undefined && score !== null && (
          <span className="font-mono font-semibold">{Math.round(score)}</span>
        )}
        <span className="text-[11px] tracking-tight">{current.label}</span>
      </div>
      {showBar && score !== undefined && score !== null && (
        <div className="w-full bg-surface-highest/60 h-1.5 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500 ease-out', current.barClass)}
            style={{ width: `${animatedWidth}%` }}
          />
        </div>
      )}
    </div>
  );
};


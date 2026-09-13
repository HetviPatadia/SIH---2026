import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
  hasDot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'neutral',
  size = 'md',
  hasDot = false,
  children,
  ...props
}) => {
  const variants = {
    neutral: 'bg-surface-highest text-foreground border-border',
    primary: 'bg-primary-muted/20 text-primary border-primary/30',
    success: 'bg-success-surface text-success border-success/30',
    warning: 'bg-warning-surface text-warning border-warning/30',
    danger: 'bg-danger-surface text-danger border-danger/30',
    info: 'bg-info-surface text-info border-info/30',
  };

  const dotColors = {
    neutral: 'bg-muted-foreground',
    primary: 'bg-primary',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
    info: 'bg-info',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 font-medium tracking-wide',
    md: 'text-xs px-2.5 py-1 font-medium',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border leading-none whitespace-nowrap select-none font-sans',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {hasDot && (
        <span className={cn('w-1.5 h-1.5 rounded-full inline-block', dotColors[variant])} />
      )}
      {children}
    </span>
  );
};

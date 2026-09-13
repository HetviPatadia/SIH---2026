import React from 'react';
import { cn } from '../../lib/utils';

export interface LoadingStateProps {
  message?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  size = 'md',
  className,
}) => {
  const spinnerSizes = {
    sm: 'w-3.5 h-3.5 border-[1.5px]',
    md: 'w-5 h-5 border-2',
    lg: 'w-8 h-8 border-[2.5px]',
  };

  return (
    <div
      className={cn(
        'rounded-full border-primary border-t-transparent animate-spin inline-block shrink-0',
        spinnerSizes[size],
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
};

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading audit records...',
  className,
  size = 'md',
}) => {
  return (
    <div className={cn('flex flex-col items-center justify-center p-8 text-center space-y-3 select-none', className)}>
      <LoadingSpinner size={size} />
      {message && <p className="text-xs text-muted-foreground font-sans max-w-sm">{message}</p>}
    </div>
  );
};

export const Skeleton: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div
    className={cn('rounded skeleton-shimmer', className)}
    {...props}
  />
);

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="p-4 space-y-2.5">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 py-2 border-b border-border/40">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-48 flex-1" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
    ))}
  </div>
);


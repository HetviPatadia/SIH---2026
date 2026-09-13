import React from 'react';
import { cn } from '../../lib/utils';
import { FolderSearch } from 'lucide-react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title = 'No Records Found',
  description = 'No matching audit records or signals found for the selected filter parameters.',
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'rounded-lg border border-dashed border-border p-10 flex flex-col items-center justify-center text-center space-y-3 bg-surface-muted/30',
        className
      )}
    >
      <div className="w-10 h-10 rounded-full bg-surface-highest flex items-center justify-center text-muted-foreground">
        {icon || <FolderSearch className="w-5 h-5" />}
      </div>
      <div className="max-w-sm space-y-1">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
};

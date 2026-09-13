import React from 'react';
import { cn } from '../../lib/utils';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'System Error',
  message = 'Unable to fetch audit data. Please verify network connection or backend services.',
  onRetry,
  className,
}) => {
  return (
    <div
      className={cn(
        'rounded-lg border border-danger/30 bg-danger-surface p-5 text-foreground flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4',
        className
      )}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-semibold text-danger">{title}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">{message}</p>
        </div>
      </div>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          className="border-danger/30 hover:bg-danger/10 text-xs shrink-0"
        >
          Retry
        </Button>
      )}
    </div>
  );
};

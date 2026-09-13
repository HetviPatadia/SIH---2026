import React from 'react';
import { cn } from '../../lib/utils';

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  className,
  title,
  description,
  actions,
  breadcrumbs,
  children,
  ...props
}) => {
  return (
    <div className={cn('p-4 lg:p-6 space-y-5 max-w-7xl mx-auto w-full', className)} {...props}>
      {(title || description || actions || breadcrumbs) && (
        <div className="space-y-1 pb-2">
          {breadcrumbs && <div className="text-xs text-muted-foreground pb-1">{breadcrumbs}</div>}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              {title && <h2 className="text-lg font-bold text-foreground tracking-tight">{title}</h2>}
              {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
            </div>
            {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
          </div>
        </div>
      )}
      <div>{children}</div>
    </div>
  );
};

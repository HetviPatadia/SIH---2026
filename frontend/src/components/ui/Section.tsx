import React from 'react';
import { cn } from '../../lib/utils';

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  title?: string;
  description?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}

export const Section: React.FC<SectionProps> = ({
  className,
  title,
  description,
  badge,
  actions,
  children,
  ...props
}) => {
  return (
    <section className={cn('space-y-3', className)} {...props}>
      {(title || description || actions || badge) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border-muted">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {title && <h2 className="text-sm font-semibold text-foreground tracking-tight">{title}</h2>}
              {badge}
            </div>
            {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}
      <div>{children}</div>
    </section>
  );
};

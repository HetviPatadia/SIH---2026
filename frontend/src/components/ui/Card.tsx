import React from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'muted' | 'outline';
  hoverElevate?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', hoverElevate = false, children, ...props }, ref) => {
    const variants = {
      default: 'bg-surface border-border text-foreground shadow-xs',
      muted: 'bg-surface-muted border-border-muted text-foreground',
      outline: 'bg-transparent border-border text-foreground',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl border p-4 transition-all duration-150',
          variants[variant],
          hoverElevate && 'hover-elevate cursor-pointer hover:border-primary/40 hover:shadow-sm',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={cn('flex items-center justify-between pb-3 mb-3 border-b border-border-muted', className)} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  children,
  ...props
}) => (
  <h3 className={cn('text-sm font-semibold text-foreground tracking-tight', className)} {...props}>
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className,
  children,
  ...props
}) => (
  <p className={cn('text-xs text-muted-foreground mt-0.5', className)} {...props}>
    {children}
  </p>
);

import React from 'react';
import { cn } from '../../lib/utils';

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  label?: string;
}

export const Divider: React.FC<DividerProps> = ({
  orientation = 'horizontal',
  className,
  label,
}) => {
  if (orientation === 'vertical') {
    return <div className={cn('w-px self-stretch bg-border-muted my-auto', className)} aria-hidden="true" />;
  }

  if (label) {
    return (
      <div className={cn('relative flex items-center w-full my-3', className)}>
        <div className="flex-grow border-t border-border-muted" />
        <span className="flex-shrink mx-3 text-[11px] uppercase tracking-wider text-muted-foreground font-mono">
          {label}
        </span>
        <div className="flex-grow border-t border-border-muted" />
      </div>
    );
  }

  return <hr className={cn('w-full border-t border-border-muted my-3', className)} aria-hidden="true" />;
};

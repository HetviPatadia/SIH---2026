import React from 'react';
import { useTheme } from '../../hooks/useTheme';
import { Sun, Moon } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ThemeToggleProps {
  className?: string;
  variant?: 'icon' | 'labeled';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className, variant = 'icon' }) => {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        'inline-flex items-center justify-center rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-background',
        variant === 'icon' ? 'w-8 h-8' : 'px-2.5 py-1.5 gap-2 border border-border',
        className
      )}
      title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
      aria-label={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-warning" />
      ) : (
        <Moon className="w-4 h-4 text-accent" />
      )}
      {variant === 'labeled' && (
        <span className="font-sans text-xs">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
      )}
    </button>
  );
};

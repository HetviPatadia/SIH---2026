import React from 'react';
import { useTheme as useAppTheme } from '../hooks/useTheme';

/**
 * Bridge ThemeContext for Landing Page
 * Connects the imported landing page seamlessly to the existing application theme system.
 */
export const useTheme = () => {
  const { resolvedTheme, toggleTheme } = useAppTheme();
  return {
    isDark: resolvedTheme === 'dark',
    toggle: toggleTheme,
  };
};

export const ThemeProvider = ({ children }) => <>{children}</>;
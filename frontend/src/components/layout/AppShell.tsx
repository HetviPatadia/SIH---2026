import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useInvestigation } from '../../context/InvestigationContext';
import { Minimize2 } from 'lucide-react';

export const AppShell: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { focusMode, setFocusMode } = useInvestigation();

  return (
    <div className="min-h-screen bg-background text-foreground flex transition-colors duration-200">
      {/* Sidebar Navigation (hidden in focus mode) */}
      {!focusMode && (
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      )}

      {/* Main Content Area */}
      <div 
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${
          focusMode ? 'pl-0' : 'lg:pl-64'
        }`}
      >
        <Header onMenuClick={() => setSidebarOpen(true)} />

        {/* Focus Mode Floating Exit Banner */}
        {focusMode && (
          <div className="bg-primary-muted/20 border-b border-primary/30 px-4 py-1.5 flex items-center justify-between text-xs animate-stagger-1 z-20">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="font-semibold text-foreground">Investigation Focus Mode Active</span>
              <span className="text-muted-foreground hidden sm:inline">— Maximized intelligence canvas</span>
            </div>
            <button
              onClick={() => setFocusMode(false)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-surface text-foreground border border-border hover:bg-surface-muted transition-colors"
            >
              <Minimize2 className="w-3 h-3" />
              <span>Exit (ESC)</span>
            </button>
          </div>
        )}

        {/* Page Content with Subtle Route Transition */}
        <main className="flex-1 overflow-y-auto">
          <div key={location.pathname} className="page-transition w-full h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

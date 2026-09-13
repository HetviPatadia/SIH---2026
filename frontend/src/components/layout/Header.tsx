import { Menu, Activity, LogOut, Maximize2 } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useInvestigation } from '../../context/InvestigationContext';

export interface HeaderProps {
  onMenuClick: () => void;
  title?: string;
  breadcrumbs?: Array<{ label: string; path?: string }>;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick, title }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { activeProjectId, navigateToIntelligence, focusMode, toggleFocusMode } = useInvestigation();

  const getAutoTitle = () => {
    if (title) return title;
    const path = location.pathname;
    if (path.startsWith('/dashboard')) return 'Executive Oversight Dashboard';
    if (path.startsWith('/reviews')) return 'Audit Review Work Queue';
    if (path.startsWith('/projects')) return 'Project Investigation Dossier';
    if (path.startsWith('/evidence/comparison')) return 'Forensic Evidence Comparator';
    if (path.startsWith('/evidence')) return 'Evidence Intelligence Workspace';
    if (path.startsWith('/nexus')) return 'Nexus Graph Intelligence';
    if (path.startsWith('/gis')) return 'GIS Intelligence';
    if (path.startsWith('/data-sources')) return 'Data Sources & Provenance';
    if (path.startsWith('/system')) return 'System Diagnostics & Health';
    return 'MPLADS Audit Intelligence';
  };

  return (
    <header className="sticky top-0 z-30 h-14 bg-surface/95 backdrop-blur-md border-b border-border px-4 lg:px-6 flex items-center justify-between transition-colors duration-150">
      {/* Left section: mobile toggle & breadcrumb / page title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-muted lg:hidden focus:outline-none focus:ring-2 focus:ring-primary active:scale-95 transition-all"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col min-w-0">
          <h1 className="text-xs sm:text-sm font-semibold text-foreground truncate tracking-tight">
            {getAutoTitle()}
          </h1>
          <span className="text-[10px] text-muted-foreground hidden sm:inline truncate font-mono">
            {location.pathname}
          </span>
        </div>
      </div>

      {/* Center section: Investigation Trail (Active Project Context) */}
      {activeProjectId && (
        <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-lg bg-surface-muted/70 border border-border text-xs animate-stagger-1 select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0" />
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Investigating:</span>
          <span className="font-mono font-bold text-primary truncate max-w-[140px]">{activeProjectId}</span>
          <div className="h-3 w-px bg-border mx-0.5" />
          <div className="flex items-center gap-1 font-sans text-[11px]">
            <button
              onClick={() => navigateToIntelligence('dossier')}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                location.pathname.startsWith('/projects')
                  ? 'bg-primary/15 text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface'
              }`}
              title="Open Project Investigation Dossier"
            >
              Dossier
            </button>
            <button
              onClick={() => navigateToIntelligence('evidence')}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                location.pathname.startsWith('/evidence') && !location.pathname.includes('comparison')
                  ? 'bg-primary/15 text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface'
              }`}
              title="Open Evidence Intelligence"
            >
              Evidence
            </button>
            <button
              onClick={() => navigateToIntelligence('nexus')}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                location.pathname.startsWith('/nexus')
                  ? 'bg-primary/15 text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface'
              }`}
              title="Open Nexus Graph"
            >
              Nexus
            </button>
            <button
              onClick={() => navigateToIntelligence('gis')}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                location.pathname.startsWith('/gis')
                  ? 'bg-primary/15 text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface'
              }`}
              title="Open GIS Intelligence"
            >
              GIS
            </button>
          </div>
        </div>
      )}

      {/* Right section: Focus Mode, System badge, Theme toggle, User session */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Focus Mode Workspace Toggle */}
        <button
          onClick={toggleFocusMode}
          className={`p-1.5 rounded-md text-xs transition-all active:scale-95 ${
            focusMode
              ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-surface-muted border border-transparent hover:border-border'
          }`}
          title={focusMode ? 'Exit Focus Mode (ESC)' : 'Investigation Focus Mode (Maximize Canvas)'}
          aria-label="Toggle Focus Mode"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-muted border border-border text-[11px] text-muted-foreground font-mono select-none">
          <Activity className="w-3 h-3 text-primary" />
          <span>DECISION SUPPORT V1.0</span>
        </div>

        <ThemeToggle />

        <div className="h-4 w-px bg-border" aria-hidden="true" />

        {/* User Session Profile & Logout */}
        <div className="flex items-center gap-2 text-left pl-1">
          <div className="w-7 h-7 rounded-full bg-surface-highest border border-border flex items-center justify-center text-xs font-semibold text-foreground">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AU'}
          </div>
          <div className="hidden sm:flex flex-col leading-none">
            <span className="text-xs font-medium text-foreground">{user?.name || 'Dr. A. Sharma'}</span>
            <span className="text-[10px] text-muted-foreground">{user?.title || 'Senior Audit Officer'}</span>
          </div>

          <button
            onClick={logout}
            className="p-1.5 ml-1 rounded-md text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors"
            title="Sign Out to Landing Page"
            aria-label="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

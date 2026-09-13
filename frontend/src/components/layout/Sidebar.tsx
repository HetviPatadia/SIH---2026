import React, { useMemo } from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useInvestigation } from '../../context/InvestigationContext';
import {
  LayoutDashboard,
  ListFilter,
  SearchCode,
  Image as ImageIcon,
  SplitSquareVertical,
  Network,
  MapPin,
  Database,
  Cpu,
  ShieldCheck,
  X,
  History,
  Bot,
} from 'lucide-react';

export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, className }) => {
  const location = useLocation();
  const { activeProjectId, recentProjects } = useInvestigation();

  const navGroups = useMemo(() => {
    const projectPath = activeProjectId ? `/projects/${activeProjectId}` : '/reviews';

    return [
      {
        title: 'OVERVIEW',
        items: [{ label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard }],
      },
      {
        title: 'AUDIT',
        items: [
          { label: 'Reviews', path: '/reviews', icon: ListFilter },
          { 
            label: 'Project Investigation', 
            path: projectPath, 
            icon: SearchCode,
            badge: activeProjectId ? 'ACTIVE' : undefined,
          },
          {
            label: 'AI Audit Copilot',
            path: activeProjectId ? `/copilot?projectId=${encodeURIComponent(activeProjectId)}` : '/copilot',
            icon: Bot,
          },
        ],
      },
      {
        title: 'EVIDENCE',
        items: [
          { label: 'Evidence Intelligence', path: activeProjectId ? `/evidence?projectId=${encodeURIComponent(activeProjectId)}` : '/evidence', icon: ImageIcon },
          { label: 'Evidence Comparison', path: '/evidence/comparison', icon: SplitSquareVertical },
        ],
      },
      {
        title: 'INTELLIGENCE',
        items: [
          { label: 'Nexus Graph', path: activeProjectId ? `/nexus?projectId=${encodeURIComponent(activeProjectId)}` : '/nexus', icon: Network },
          { label: 'GIS Intelligence', path: activeProjectId ? `/gis?projectId=${encodeURIComponent(activeProjectId)}` : '/gis', icon: MapPin },
        ],
      },
      {
        title: 'SYSTEM',
        items: [
          { label: 'Data Sources', path: '/data-sources', icon: Database },
          { label: 'System', path: '/system', icon: Cpu },
        ],
      },
    ];
  }, [activeProjectId]);

  const isRouteActive = (path: string) => {
    const cleanPath = path.split('?')[0];
    if (cleanPath.startsWith('/projects')) {
      return location.pathname.startsWith('/projects');
    }
    return location.pathname === cleanPath;
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-xs"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-50 w-64 bg-surface border-r border-border flex flex-col justify-between transition-all duration-200 ease-in-out lg:translate-x-0 select-none',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          className
        )}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Logo Header */}
          <div className="h-14 px-4 flex items-center justify-between border-b border-border bg-surface">
            <Link to="/dashboard" className="flex items-center gap-2.5 min-w-0 group">
              <div className="w-8 h-8 rounded-md bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-foreground truncate tracking-tight">
                  MPLADS Audit
                </span>
                <span className="text-[10px] text-muted-foreground truncate font-sans">
                  Audit &amp; Evidence Workspace
                </span>
              </div>
            </Link>
            <button
              onClick={onClose}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-surface-muted lg:hidden"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
            {navGroups.map((group) => (
              <div key={group.title} className="space-y-1">
                <div className="px-2 text-[10px] font-semibold text-muted-foreground tracking-wider font-mono">
                  {group.title}
                </div>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = isRouteActive(item.path);
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.label}
                        to={item.path}
                        onClick={() => {
                          if (window.innerWidth < 1024) onClose();
                        }}
                        className={cn(
                          'group flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150',
                          active
                            ? 'bg-primary/10 text-primary font-semibold border-l-2 border-primary -ml-[2px] pl-[12px]'
                            : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground'
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon className={cn('w-4 h-4 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5', active ? 'text-primary' : 'text-muted-foreground')} />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-primary/20 text-primary uppercase">
                            {item.badge}
                          </span>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Recent Investigations Memory */}
            {recentProjects.length > 0 && (
              <div className="pt-2 border-t border-border/60 space-y-1.5">
                <div className="px-2 flex items-center justify-between text-[10px] font-semibold text-muted-foreground tracking-wider font-mono">
                  <span className="flex items-center gap-1">
                    <History className="w-3 h-3" />
                    <span>RECENT AUDITS</span>
                  </span>
                </div>
                <div className="space-y-0.5">
                  {recentProjects.slice(0, 3).map((rp) => (
                    <Link
                      key={rp.projectId}
                      to={`/projects/${rp.projectId}`}
                      onClick={() => {
                        if (window.innerWidth < 1024) onClose();
                      }}
                      className={cn(
                        'flex flex-col px-2.5 py-1 rounded text-xs transition-colors hover:bg-surface-muted',
                        activeProjectId === rp.projectId ? 'bg-surface-muted font-medium' : 'text-muted-foreground'
                      )}
                    >
                      <span className="font-mono text-[11px] text-foreground truncate font-semibold">
                        {rp.projectId}
                      </span>
                      <span className="text-[10px] text-muted-foreground truncate">
                        {rp.title || 'Investigated Project'}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer info badge */}
        <div className="p-3 border-t border-border bg-surface-muted/50">
          <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-success status-pulse-live inline-block" />
              <span>CORE ONLINE</span>
            </span>
            <span className="text-[10px] text-muted-foreground">SIH26102</span>
          </div>
        </div>
      </aside>
    </>
  );
};

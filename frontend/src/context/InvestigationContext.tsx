import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export interface RecentProject {
  projectId: string;
  title: string;
  timestamp: number;
}

interface InvestigationContextType {
  activeProjectId: string | null;
  activeProjectTitle: string | null;
  recentProjects: RecentProject[];
  focusMode: boolean;
  setActiveProject: (projectId: string, title?: string) => void;
  clearActiveProject: () => void;
  toggleFocusMode: () => void;
  setFocusMode: (active: boolean) => void;
  navigateToIntelligence: (destination: 'dossier' | 'evidence' | 'comparison' | 'nexus' | 'gis') => void;
}

const InvestigationContext = createContext<InvestigationContextType | undefined>(undefined);

const STORAGE_ACTIVE_ID = 'mplads_active_project_id';
const STORAGE_ACTIVE_TITLE = 'mplads_active_project_title';
const STORAGE_RECENT = 'mplads_recent_projects';

export const InvestigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // 1. Initial State from localStorage
  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_ACTIVE_ID) || null;
    } catch {
      return null;
    }
  });

  const [activeProjectTitle, setActiveProjectTitleState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_ACTIVE_TITLE) || null;
    } catch {
      return null;
    }
  });

  const [recentProjects, setRecentProjects] = useState<RecentProject[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_RECENT);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [focusMode, setFocusMode] = useState<boolean>(false);

  // 2. Sync active project from current URL
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const paramId = searchParams.get('projectId') || searchParams.get('project_id');
    
    // Check if on /projects/:projectId
    const match = location.pathname.match(/\/projects\/([A-Za-z0-9_-]+)/);
    const routeId = match ? match[1] : null;

    const detectedId = routeId || paramId;
    if (detectedId && detectedId !== activeProjectId) {
      setActiveProject(detectedId);
    }
  }, [location.pathname, location.search, activeProjectId]);

  // 3. Register ESC key to exit Focus Mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && focusMode) {
        setFocusMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusMode]);

  // 4. Set Active Project with Recent History Storage
  const setActiveProject = useCallback((projectId: string, title?: string) => {
    if (!projectId || !projectId.trim()) return;
    const cleanId = projectId.trim();
    const cleanTitle = title?.trim() || cleanId;

    setActiveProjectIdState(cleanId);
    setActiveProjectTitleState(cleanTitle);

    try {
      localStorage.setItem(STORAGE_ACTIVE_ID, cleanId);
      localStorage.setItem(STORAGE_ACTIVE_TITLE, cleanTitle);

      setRecentProjects((prev) => {
        const filtered = prev.filter((p) => p.projectId !== cleanId);
        const updated = [
          { projectId: cleanId, title: cleanTitle, timestamp: Date.now() },
          ...filtered,
        ].slice(0, 5); // Keep up to 5 recent projects

        localStorage.setItem(STORAGE_RECENT, JSON.stringify(updated));
        return updated;
      });
    } catch (e) {
      console.warn('Failed to persist investigation state:', e);
    }
  }, []);

  // 5. Clear Active Project
  const clearActiveProject = useCallback(() => {
    setActiveProjectIdState(null);
    setActiveProjectTitleState(null);
    try {
      localStorage.removeItem(STORAGE_ACTIVE_ID);
      localStorage.removeItem(STORAGE_ACTIVE_TITLE);
    } catch (e) {
      console.warn('Failed to clear investigation state:', e);
    }
  }, []);

  const toggleFocusMode = useCallback(() => {
    setFocusMode((prev) => !prev);
  }, []);

  // 6. Navigation helper between intelligence screens preserving active project
  const navigateToIntelligence = useCallback(
    (destination: 'dossier' | 'evidence' | 'comparison' | 'nexus' | 'gis') => {
      const pid = activeProjectId;
      switch (destination) {
        case 'dossier':
          navigate(pid ? `/projects/${pid}` : '/reviews');
          break;
        case 'evidence':
          navigate(pid ? `/evidence?projectId=${encodeURIComponent(pid)}` : '/evidence');
          break;
        case 'comparison':
          navigate('/evidence/comparison');
          break;
        case 'nexus':
          navigate(pid ? `/nexus?projectId=${encodeURIComponent(pid)}` : '/nexus');
          break;
        case 'gis':
          navigate(pid ? `/gis?projectId=${encodeURIComponent(pid)}` : '/gis');
          break;
      }
    },
    [activeProjectId, navigate]
  );

  return (
    <InvestigationContext.Provider
      value={{
        activeProjectId,
        activeProjectTitle,
        recentProjects,
        focusMode,
        setActiveProject,
        clearActiveProject,
        toggleFocusMode,
        setFocusMode,
        navigateToIntelligence,
      }}
    >
      {children}
    </InvestigationContext.Provider>
  );
};

export const useInvestigation = () => {
  const context = useContext(InvestigationContext);
  if (!context) {
    throw new Error('useInvestigation must be used within an InvestigationProvider');
  }
  return context;
};

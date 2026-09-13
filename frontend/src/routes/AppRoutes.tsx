import React from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuth } from '../context/AuthContext';

// Public Pages
import LandingPage from '../pages/LandingPage';
import AuditorLoginPage from '../pages/AuditorLogin';
import PublicAdvisoryPage from '../pages/PublicAdvisory';
import PublicPortalPage from '../pages/PublicPortal';

// Protected Auditor Workspace Pages
import DashboardPage from '../pages/Dashboard';
import ReviewsPage from '../pages/Reviews';
import ProjectInvestigationPage from '../pages/ProjectInvestigation';
import EvidenceIntelligencePage from '../pages/EvidenceIntelligence';
import EvidenceComparisonPage from '../pages/EvidenceComparison';
import NexusGraphPage from '../pages/NexusGraph';
import GISPage from '../pages/GIS';
import DataSourcesPage from '../pages/DataSources';
import SystemPage from '../pages/System';
import CopilotWorkspacePage from '../pages/Copilot';

import { EmptyState } from '../components/feedback/EmptyState';
import { Button } from '../components/ui/Button';

import { useLocation } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
  const location = useLocation();

  return (
    <div className="p-8 max-w-xl mx-auto">
      <EmptyState
        title="Route Not Found"
        description={`The requested route "${location.pathname}" was not found.`}
        action={
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <Link to="/dashboard">
              <Button variant="primary" size="sm">Dashboard</Button>
            </Link>
            <Link to="/reviews">
              <Button variant="outline" size="sm">Reviews</Button>
            </Link>
            <Link to="/copilot">
              <Button variant="outline" size="sm">AI Copilot</Button>
            </Link>
          </div>
        }
      />
    </div>
  );
};

const LandingPageRoute: React.FC = () => {
  const { clearSession, isAuthenticated } = useAuth();

  React.useEffect(() => {
    if (isAuthenticated) {
      clearSession();
    }
  }, [isAuthenticated, clearSession]);

  return <LandingPage />;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* 1. Public Entry Routes */}
      <Route path="/" element={<LandingPageRoute />} />
      <Route path="/auditor/login" element={<AuditorLoginPage />} />
      <Route path="/login" element={<Navigate to="/auditor/login" replace />} />
      <Route path="/public" element={<PublicPortalPage />} />
      <Route path="/public/advisory" element={<PublicAdvisoryPage />} />

      {/* 2. Private Protected Auditor Workspace */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/reviews" element={<ReviewsPage />} />
          <Route path="/projects/:projectId" element={<ProjectInvestigationPage />} />
          <Route path="/projects" element={<Navigate to="/reviews" replace />} />
          <Route path="/investigation" element={<Navigate to="/reviews" replace />} />
          <Route path="/investigations" element={<Navigate to="/reviews" replace />} />
          <Route path="/evidence" element={<EvidenceIntelligencePage />} />
          <Route path="/evidence/comparison" element={<EvidenceComparisonPage />} />
          <Route path="/evidence/compare" element={<EvidenceComparisonPage />} />
          <Route path="/nexus" element={<NexusGraphPage />} />
          <Route path="/gis" element={<GISPage />} />
          <Route path="/copilot" element={<CopilotWorkspacePage />} />
          <Route path="/ai-copilot" element={<Navigate to="/copilot" replace />} />
          <Route path="/data-sources" element={<DataSourcesPage />} />
          <Route path="/system" element={<SystemPage />} />
        </Route>
      </Route>

      {/* 3. Catch-all */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default AppRoutes;

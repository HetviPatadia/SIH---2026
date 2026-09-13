import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute Component
 * Restricts private audit workspace routes to authenticated auditors.
 * Redirects unauthenticated visitors to /auditor/login with origin state.
 */
export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/auditor/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;

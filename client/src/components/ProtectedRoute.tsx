import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles?: Role[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, role, isBanned } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gaming-bg flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin shadow-glow-cyan"></div>
          <span className="text-cyan-400 font-heading tracking-widest text-sm uppercase animate-pulse">
            Loading System Access...
          </span>
        </div>
      </div>
    );
  }

  // 1. Unauthenticated users redirected to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Banned accounts immediately redirected to Banned Notice Screen
  if (isBanned && location.pathname !== '/banned') {
    return <Navigate to="/banned" replace />;
  }

  // 3. Role authorization check
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // Redirect to their respective authorized dashboard
    if (role === 'ADMIN') return <Navigate to="/admin" replace />;
    if (role === 'ORGANIZER') return <Navigate to="/organizer" replace />;
    return <Navigate to="/player" replace />;
  }

  return children;
};

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PublicLayout } from './layouts/PublicLayout';
import { DashboardLayout } from './layouts/DashboardLayout';
import { ProtectedRoute } from './components/ProtectedRoute';

import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { BannedNoticePage } from './pages/BannedNoticePage';
import { AdminDashboard } from './pages/AdminDashboard';
import { OrganizerDashboard } from './pages/OrganizerDashboard';
import { OrganizerDatabaseViewer } from './pages/OrganizerDatabaseViewer';
import { PlayerDashboard } from './pages/PlayerDashboard';
import { TournamentDetailsPage } from './pages/TournamentDetailsPage';
import { TournamentCatalogPage } from './pages/TournamentCatalogPage';
import { TournamentLivePage } from './pages/TournamentLivePage';
import { OrganizerScoringConsole } from './pages/OrganizerScoringConsole';
import { RefereeDashboard } from './pages/RefereeDashboard';
import { DisputesReviewBoard } from './pages/DisputesReviewBoard';
import { GamesCatalogPage } from './pages/GamesCatalogPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes with Standard Public Layout */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/tournaments" element={<TournamentCatalogPage />} />
          <Route path="/tournaments/:id" element={<TournamentDetailsPage />} />
          <Route path="/tournaments/:id/live" element={<TournamentLivePage />} />
          <Route path="/games" element={<GamesCatalogPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* Dedicated Account Restricted Notice Page */}
        <Route path="/banned" element={<BannedNoticePage />} />

        {/* Authenticated Dashboard Routes with ProtectedRoute Guards */}
        <Route element={<DashboardLayout />}>
          {/* Admin Routes - Strictly ADMIN */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/audit-logs"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Organizer Routes - Strictly ORGANIZER / ADMIN */}
          <Route
            path="/organizer"
            element={
              <ProtectedRoute allowedRoles={['ORGANIZER', 'ADMIN']}>
                <OrganizerDashboard />
              </ProtectedRoute>
            }
          />

          {/* Dedicated Scoped Tournament Database Viewer */}
          <Route
            path="/organizer/tournaments/:id/database"
            element={
              <ProtectedRoute allowedRoles={['ORGANIZER', 'ADMIN']}>
                <OrganizerDatabaseViewer />
              </ProtectedRoute>
            }
          />

          {/* Real-Time Match Scoring & Bracket Console */}
          <Route
            path="/organizer/tournaments/:id/scoring"
            element={
              <ProtectedRoute allowedRoles={['ORGANIZER', 'ADMIN']}>
                <OrganizerScoringConsole />
              </ProtectedRoute>
            }
          />

          {/* Disputes Review Board - Accessible to Organizers, Referees, and Admins */}
          <Route
            path="/organizer/disputes"
            element={
              <ProtectedRoute allowedRoles={['ORGANIZER', 'REFEREE', 'ADMIN']}>
                <DisputesReviewBoard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/referee/disputes"
            element={
              <ProtectedRoute allowedRoles={['REFEREE', 'ORGANIZER', 'ADMIN']}>
                <DisputesReviewBoard />
              </ProtectedRoute>
            }
          />

          {/* Referee Portal & Verification Dashboard - Strictly REFEREE / ADMIN */}
          <Route
            path="/referee"
            element={
              <ProtectedRoute allowedRoles={['REFEREE', 'ADMIN']}>
                <RefereeDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/referee/dashboard"
            element={
              <ProtectedRoute allowedRoles={['REFEREE', 'ADMIN']}>
                <RefereeDashboard />
              </ProtectedRoute>
            }
          />

          {/* Player Routes - Strictly PLAYER */}
          <Route
            path="/player"
            element={
              <ProtectedRoute allowedRoles={['PLAYER', 'ADMIN']}>
                <PlayerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/player/my-tournaments"
            element={
              <ProtectedRoute allowedRoles={['PLAYER', 'ADMIN']}>
                <PlayerDashboard />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Catch-all fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
};

export default App;

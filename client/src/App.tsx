import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
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
import { MatchControlRoomPage } from './pages/MatchControlRoomPage';
import { ScoreVerificationPage } from './pages/ScoreVerificationPage';
import { RefereeDisputesPage } from './pages/RefereeDisputesPage';

const DashboardRedirect: React.FC = () => {
  const { role } = useAuth();
  if (role === 'ADMIN') return <Navigate to="/admin" replace />;
  if (role === 'ORGANIZER') return <Navigate to="/organizer" replace />;
  if (role === 'REFEREE') return <Navigate to="/referee/dashboard" replace />;
  return <Navigate to="/player" replace />;
};

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
          {/* Universal Dashboard Redirect based on Role */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardRedirect />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/referee"
            element={<Navigate to="/referee/dashboard" replace />}
          />

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
            element={<Navigate to="/admin" replace />}
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

          {/* Dedicated Scoped Tournament Database Viewer (Organizer, Admin, and Referee read-only) */}
          <Route
            path="/organizer/tournaments/:id/database"
            element={
              <ProtectedRoute allowedRoles={['ORGANIZER', 'ADMIN', 'REFEREE']}>
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
              <ProtectedRoute allowedRoles={['REFEREE', 'ADMIN', 'ORGANIZER']}>
                <RefereeDisputesPage />
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
          <Route
            path="/referee/portal"
            element={
              <ProtectedRoute allowedRoles={['REFEREE', 'ADMIN']}>
                <RefereeDashboard />
              </ProtectedRoute>
            }
          />

          {/* Match Check-in & Roster Checklist Room */}
          <Route
            path="/referee/matches/:id"
            element={
              <ProtectedRoute allowedRoles={['REFEREE', 'ADMIN']}>
                <MatchControlRoomPage />
              </ProtectedRoute>
            }
          />
          {/* Score Verification & Official Sign-off Engine */}
          <Route
            path="/referee/matches/:id/verify"
            element={
              <ProtectedRoute allowedRoles={['REFEREE', 'ADMIN']}>
                <ScoreVerificationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/referee/tournaments/:id/database"
            element={
              <ProtectedRoute allowedRoles={['REFEREE', 'ADMIN', 'ORGANIZER']}>
                <OrganizerDatabaseViewer />
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

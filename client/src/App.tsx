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
import { LiveTournamentPage } from './pages/LiveTournamentPage';
import { OrganizerScoringConsole } from './pages/OrganizerScoringConsole';
import { RefereeDashboard } from './pages/RefereeDashboard';
import { DisputesReviewPage } from './pages/DisputesReviewPage';
import { MatchScoreVerificationPage } from './pages/MatchScoreVerificationPage';
import { GamesCatalogPage } from './pages/GamesCatalogPage';
import { GameDetailPage } from './pages/GameDetailPage';
import { EmailVerificationNoticePage } from './pages/EmailVerificationNoticePage';
import { EmailVerificationPage } from './pages/EmailVerificationPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { OtpVerificationPage } from './pages/OtpVerificationPage';
import { ProfileSettingsPage } from './pages/ProfileSettingsPage';

import ScrollToTop from './components/common/ScrollToTop';

const RoleDashboardRedirect: React.FC = () => {
  const { role } = useAuth();
  if (role === 'ADMIN') return <Navigate to="/admin" replace />;
  if (role === 'ORGANIZER') return <Navigate to="/organizer" replace />;
  if (role === 'REFEREE') return <Navigate to="/referee/portal" replace />;
  return <Navigate to="/player" replace />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ScrollToTop />
      <Routes>
        {/* Public Routes with Standard Public Layout */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/games" element={<GamesCatalogPage />} />
          <Route path="/games/:idOrSlug" element={<GameDetailPage />} />
          <Route path="/tournaments" element={<TournamentCatalogPage />} />
          <Route path="/tournaments/:id" element={<TournamentDetailsPage />} />
          <Route path="/tournaments/:id/live" element={<LiveTournamentPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-notice" element={<EmailVerificationNoticePage />} />
          <Route path="/verify-otp" element={<OtpVerificationPage />} />
          <Route path="/verify-email" element={<EmailVerificationPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>



        {/* Dedicated Account Restricted Notice Page */}
        <Route path="/banned" element={<BannedNoticePage />} />

        {/* Authenticated Dashboard Routes with ProtectedRoute Guards */}
        <Route element={<DashboardLayout />}>
          {/* Default /dashboard root redirect based on authenticated user's active role */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'ORGANIZER', 'REFEREE', 'PLAYER']}>
                <RoleDashboardRedirect />
              </ProtectedRoute>
            }
          />
          <Route path="/dashboard/referee" element={<Navigate to="/referee/portal" replace />} />

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
            path="/admin/overview"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/admin/games" element={<Navigate to="/games" replace />} />
          <Route path="/admin/tournaments" element={<Navigate to="/tournaments" replace />} />
          <Route
            path="/admin/disputes"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <DisputesReviewPage />
              </ProtectedRoute>
            }
          />
          <Route path="/admin/audit-logs" element={<Navigate to="/admin" replace />} />

          {/* Referee Routes - REFEREE / ORGANIZER / ADMIN */}
          <Route path="/referee">
            <Route index element={<Navigate to="/referee/portal" replace />} />
            <Route
              path="portal"
              element={
                <ProtectedRoute allowedRoles={['REFEREE', 'ORGANIZER', 'ADMIN']}>
                  <RefereeDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="dashboard"
              element={<Navigate to="/referee/portal" replace />}
            />
            <Route
              path="disputes"
              element={
                <ProtectedRoute allowedRoles={['REFEREE', 'ORGANIZER', 'ADMIN']}>
                  <DisputesReviewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="matches/:id/verify"
              element={
                <ProtectedRoute allowedRoles={['REFEREE', 'ORGANIZER', 'ADMIN']}>
                  <MatchScoreVerificationPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Organizer Routes - Strictly ORGANIZER / ADMIN */}
          <Route
            path="/organizer"
            element={
              <ProtectedRoute allowedRoles={['ORGANIZER', 'ADMIN']}>
                <OrganizerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizer/tournaments"
            element={
              <ProtectedRoute allowedRoles={['ORGANIZER', 'ADMIN']}>
                <OrganizerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizer/create"
            element={
              <ProtectedRoute allowedRoles={['ORGANIZER', 'ADMIN']}>
                <OrganizerDashboard defaultCreateModal={true} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizer/teams"
            element={
              <ProtectedRoute allowedRoles={['ORGANIZER', 'ADMIN']}>
                <OrganizerDashboard defaultTab="teams" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizer/rules"
            element={
              <ProtectedRoute allowedRoles={['ORGANIZER', 'ADMIN']}>
                <OrganizerDashboard defaultTab="rules" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizer/disputes"
            element={
              <ProtectedRoute allowedRoles={['ORGANIZER', 'ADMIN']}>
                <DisputesReviewPage />
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

          {/* Organizer Scoring Console with Live WebSocket Broadcasts */}
          <Route
            path="/organizer/tournaments/:id/scoring"
            element={
              <ProtectedRoute allowedRoles={['ORGANIZER', 'ADMIN']}>
                <OrganizerScoringConsole />
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
                <PlayerDashboard defaultTab="MY_TOURNAMENTS" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/player/matches"
            element={
              <ProtectedRoute allowedRoles={['PLAYER', 'ADMIN']}>
                <PlayerDashboard defaultTab="HISTORY" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/player/teams"
            element={
              <ProtectedRoute allowedRoles={['PLAYER', 'ADMIN']}>
                <PlayerDashboard defaultTab="MY_TOURNAMENTS" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/player/browse"
            element={
              <ProtectedRoute allowedRoles={['PLAYER', 'ADMIN']}>
                <PlayerDashboard defaultTab="BROWSE" />
              </ProtectedRoute>
            }
          />

          {/* Support /dashboard player aliases */}
          <Route path="/dashboard/my-tournaments" element={<Navigate to="/player/my-tournaments" replace />} />
          <Route path="/dashboard/matches" element={<Navigate to="/player/matches" replace />} />
          <Route path="/dashboard/teams" element={<Navigate to="/player/teams" replace />} />

          {/* Account & Profile Settings */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'ORGANIZER', 'REFEREE', 'PLAYER']}>
                <ProfileSettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'ORGANIZER', 'REFEREE', 'PLAYER']}>
                <ProfileSettingsPage />
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

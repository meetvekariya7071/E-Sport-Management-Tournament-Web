import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Gamepad2, LogOut, Shield, Trophy, User as UserIcon, Menu, X, ChevronRight, Bell } from 'lucide-react';
import { NotificationBell } from './NotificationBell';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
    navigate('/login');
  };

  const getDashboardPath = () => {
    if (role === 'ADMIN') return '/admin';
    if (role === 'ORGANIZER') return '/organizer';
    if (role === 'REFEREE') return '/referee/dashboard';
    return '/player';
  };

  const getRoleBadgeColor = () => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'ORGANIZER':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case 'REFEREE':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'PLAYER':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-gaming-bg/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center space-x-3 group" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-glow-cyan transition-transform group-hover:scale-105">
            <Gamepad2 className="w-6 h-6 text-black" />
          </div>
          <div className="flex flex-col">
            <span className="font-heading font-bold text-xl tracking-wider text-white flex items-center gap-1.5">
              GLOBAL<span className="text-cyan-400">TROTTER</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono -mt-1 tracking-widest uppercase">
              Esports Management
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-1 lg:space-x-4">
          <Link
            to="/"
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              location.pathname === '/' ? 'text-cyan-400 bg-slate-800/60' : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            Home
          </Link>
          <Link
            to="/tournaments"
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              location.pathname.startsWith('/tournaments') ? 'text-cyan-400 bg-slate-800/60' : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            Tournaments
          </Link>
          <Link
            to="/games"
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              location.pathname.startsWith('/games') ? 'text-cyan-400 bg-slate-800/60' : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            Games
          </Link>
          {isAuthenticated && (
            <Link
              to={getDashboardPath()}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                location.pathname.startsWith('/admin') ||
                location.pathname.startsWith('/organizer') ||
                location.pathname.startsWith('/player') ||
                location.pathname.startsWith('/referee')
                  ? 'text-cyan-400 bg-slate-800/60'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              Dashboard
            </Link>
          )}
        </nav>

        {/* Desktop User / Auth Controls */}
        <div className="hidden md:flex items-center space-x-3">
          {isAuthenticated && user ? (
            <div className="flex items-center space-x-3">
              {/* Real-time Notification Bell */}
              <NotificationBell />

              {/* Profile Pill */}
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 font-bold text-sm">
                  {user.username.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-semibold text-white leading-tight">
                    {user.username}
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded border font-mono uppercase tracking-wider ${getRoleBadgeColor()}`}
                  >
                    {user.role}
                  </span>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                title="Logout"
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                to="/login"
                className="px-3.5 py-1.5 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors"
              >
                Log In
              </Link>
              <Link
                to="/register"
                className="px-4 py-1.5 text-sm font-medium text-black bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow-glow-cyan font-heading font-semibold transition-all transform hover:-translate-y-0.5"
              >
                Register
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Controls (Bell + Hamburger) */}
        <div className="flex items-center space-x-2 md:hidden">
          {isAuthenticated && <NotificationBell />}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 focus:outline-none transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 z-50 bg-gaming-bg/95 backdrop-blur-xl border-t border-slate-800 flex flex-col justify-between p-6 overflow-y-auto animate-fade-in">
          <div className="space-y-6">
            {/* Authenticated User Card if logged in */}
            {isAuthenticated && user && (
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 font-bold">
                    {user.username.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{user.username}</p>
                    <p className="text-xs text-slate-400 font-mono">{user.email}</p>
                  </div>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded border font-mono uppercase tracking-wider ${getRoleBadgeColor()}`}
                >
                  {user.role}
                </span>
              </div>
            )}

            {/* Navigation Links */}
            <div className="space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400 px-3">
                Navigation
              </span>
              <div className="space-y-1">
                <Link
                  to="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                    location.pathname === '/'
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                      : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                  }`}
                >
                  <span>Home</span>
                  <ChevronRight className="w-4 h-4 opacity-50" />
                </Link>

                <Link
                  to="/tournaments"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                    location.pathname.startsWith('/tournaments')
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                      : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                  }`}
                >
                  <span>Tournaments</span>
                  <ChevronRight className="w-4 h-4 opacity-50" />
                </Link>

                <Link
                  to="/games"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                    location.pathname.startsWith('/games')
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                      : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                  }`}
                >
                  <span>Games</span>
                  <ChevronRight className="w-4 h-4 opacity-50" />
                </Link>

                {isAuthenticated && (
                  <Link
                    to={getDashboardPath()}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                      location.pathname.startsWith('/admin') ||
                      location.pathname.startsWith('/organizer') ||
                      location.pathname.startsWith('/player') ||
                      location.pathname.startsWith('/referee')
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                        : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                    }`}
                  >
                    <span>{role} Dashboard</span>
                    <ChevronRight className="w-4 h-4 opacity-50" />
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Bottom Actions */}
          <div className="pt-6 border-t border-slate-800 space-y-3">
            {isAuthenticated ? (
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-sm font-medium text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center py-3 px-4 rounded-xl text-sm font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center py-3 px-4 rounded-xl text-sm font-bold text-black bg-cyan-400 hover:bg-cyan-300 transition-colors shadow-glow-cyan"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

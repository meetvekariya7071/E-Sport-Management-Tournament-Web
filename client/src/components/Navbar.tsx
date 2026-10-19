import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Gamepad2, LogOut, Shield, Trophy, User as UserIcon, Bell } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getDashboardPath = () => {
    if (role === 'ADMIN') return '/admin';
    if (role === 'ORGANIZER') return '/organizer';
    return '/player';
  };

  const getRoleBadgeColor = () => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'ORGANIZER':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
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
        <Link to="/" className="flex items-center space-x-3 group">
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

        {/* Navigation Links */}
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
          {isAuthenticated && (
            <Link
              to={getDashboardPath()}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                location.pathname.startsWith('/admin') ||
                location.pathname.startsWith('/organizer') ||
                location.pathname.startsWith('/player')
                  ? 'text-cyan-400 bg-slate-800/60'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              Dashboard
            </Link>
          )}
        </nav>

        {/* User / Auth Controls */}
        <div className="flex items-center space-x-3">
          {isAuthenticated && user ? (
            <div className="flex items-center space-x-3">
              {/* Notification stub */}
              <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors relative">
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-cyan-400 rounded-full animate-ping"></span>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-cyan-400 rounded-full"></span>
              </button>

              {/* Profile Pill */}
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 font-bold text-sm">
                  {user.username.slice(0, 2).toUpperCase()}
                </div>
                <div className="hidden sm:flex flex-col text-left">
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
      </div>
    </header>
  );
};

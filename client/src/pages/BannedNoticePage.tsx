import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Ban, ShieldAlert, LogOut, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const BannedNoticePage: React.FC = () => {
  const { user, banReason, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gaming-bg flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-3xl bg-slate-900 border-2 border-red-500/40 p-8 shadow-2xl relative overflow-hidden text-center space-y-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="w-20 h-20 rounded-2xl bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center mx-auto text-red-500 shadow-glow-red">
          <Ban className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-mono font-bold tracking-widest uppercase">
            Platform Disciplinary Action
          </span>
          <h1 className="text-3xl font-heading font-extrabold text-white">
            ACCOUNT SUSPENDED
          </h1>
          <p className="text-sm text-slate-300">
            Account <span className="text-red-400 font-semibold">{user?.username || 'User'}</span> has
            been restricted from accessing tournaments, brackets, and matchmaking features.
          </p>
        </div>

        {/* Reason Card */}
        <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 text-left space-y-1">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
            Violation Notice:
          </span>
          <p className="text-xs text-red-300 font-medium leading-relaxed">
            {banReason || user?.banReason || 'Your account was flagged for a violation of the Esports Fair Play Code of Conduct.'}
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={handleLogout}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center justify-center space-x-2 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>

          <a
            href="mailto:support@esports.com"
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-heading font-bold shadow-glow-red flex items-center justify-center space-x-2 transition-all"
          >
            <Mail className="w-4 h-4" />
            <span>Appeal Violation</span>
          </a>
        </div>
      </div>
    </div>
  );
};

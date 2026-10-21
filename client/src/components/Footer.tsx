import React from 'react';
import { Link } from 'react-router-dom';
import { Gamepad2, Shield, Trophy, ExternalLink, Sparkles, Scale, HelpCircle } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-slate-800 bg-slate-950/80 backdrop-blur-sm text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {/* Column 1: Brand & Tagline */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center space-x-3 group w-fit">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-glow-cyan transition-transform group-hover:scale-105">
                <Gamepad2 className="w-5 h-5 text-black" />
              </div>
              <div className="flex flex-col">
                <span className="font-heading font-bold text-lg tracking-wider text-white">
                  League<span className="text-cyan-400">Forge</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono -mt-1 tracking-widest uppercase">
                  ESPORTS MANAGEMENT
                </span>
              </div>
            </Link>

            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Next-generation esports tournament and bracket management. Empowering competitive players, verified organizers, and official referees worldwide.
            </p>

            <div className="flex items-center space-x-2 pt-1 text-[11px] font-mono text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Platform Status: Systems Operational</span>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-heading font-extrabold uppercase tracking-widest text-slate-200">
              Quick Links
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  to="/"
                  className="hover:text-cyan-400 transition-colors inline-flex items-center gap-1.5"
                >
                  <span className="text-slate-600">•</span> Home
                </Link>
              </li>
              <li>
                <Link
                  to="/tournaments"
                  className="hover:text-cyan-400 transition-colors inline-flex items-center gap-1.5"
                >
                  <span className="text-slate-600">•</span> Tournaments
                </Link>
              </li>
              <li>
                <Link
                  to="/games"
                  className="hover:text-cyan-400 transition-colors inline-flex items-center gap-1.5"
                >
                  <span className="text-slate-600">•</span> Games Catalog
                </Link>
              </li>
              <li>
                <Link
                  to="/dashboard"
                  className="hover:text-cyan-400 transition-colors inline-flex items-center gap-1.5"
                >
                  <span className="text-slate-600">•</span> Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Support & Fair Play */}
          <div className="space-y-3">
            <h4 className="text-xs font-heading font-extrabold uppercase tracking-widest text-slate-200">
              Support & Fair Play
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  to="/tournaments"
                  className="hover:text-cyan-400 transition-colors inline-flex items-center gap-1.5"
                >
                  <Shield className="w-3.5 h-3.5 text-cyan-500/70" />
                  <span>Rules & Guidelines</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/dashboard"
                  className="hover:text-cyan-400 transition-colors inline-flex items-center gap-1.5"
                >
                  <Scale className="w-3.5 h-3.5 text-cyan-500/70" />
                  <span>Dispute Center</span>
                </Link>
              </li>
              <li>
                <a
                  href="mailto:support@leagueforge.gg"
                  className="hover:text-cyan-400 transition-colors inline-flex items-center gap-1.5"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-cyan-500/70" />
                  <span>Contact Support</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Platform Assurance */}
        <div className="mt-10 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p className="text-center sm:text-left">
            © 2026 LeagueForge. All rights reserved. Built for competitive esports.
          </p>
          <div className="flex items-center space-x-4 text-[11px] font-mono text-slate-500">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-cyan-400/80" />
              Fair Play Certified
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Trophy className="w-3 h-3 text-yellow-400/80" />
              Real-time Bracket Engine
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

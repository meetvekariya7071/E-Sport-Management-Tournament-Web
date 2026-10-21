import React from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Flame } from 'lucide-react';

export const HeroSection: React.FC = () => {
  return (
    <section className="relative rounded-3xl p-8 sm:p-14 overflow-hidden border border-cyan-500/20 bg-gradient-to-br from-slate-900 via-gaming-card to-slate-950 shadow-2xl">
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 max-w-3xl space-y-6">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono tracking-wider uppercase">
          <Flame className="w-3.5 h-3.5 text-cyan-400" />
          <span>LeagueForge Competitive Arena</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-heading font-extrabold text-white tracking-wide leading-tight">
          COMPETE. ORGANIZE. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">
            DOMINATE THE ARENA.
          </span>
        </h1>

        <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-2xl">
          LeagueForge is a high-performance tournament management system built for Solo showdowns, Duo partnerships,
          and 5-man Squad battles with strict relational data isolation and real-time RBAC oversight.
        </p>

        <div className="flex flex-wrap items-center gap-4 pt-4">
          <Link
            to="/tournaments"
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-black font-heading font-bold tracking-wide shadow-glow-cyan flex items-center space-x-2 transition-all transform hover:-translate-y-0.5"
          >
            <Trophy className="w-5 h-5" />
            <span>Browse Tournaments</span>
          </Link>
        </div>
      </div>
    </section>
  );
};

import React from 'react';
import { Link } from 'react-router-dom';
const heroBanner = '/images/hero-banner.jpg';

export const HeroSection: React.FC = () => {
  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-cyan-500/30 bg-slate-950 p-8 md:p-12 shadow-[0_0_50px_-12px_rgba(6,182,212,0.35)]">
      {/* Vibrant Radial Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-500/25 via-blue-600/15 to-transparent pointer-events-none" />

      {/* Brightened Background Image Layer (No luminosity washout) */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-70 scale-105 pointer-events-none transition-all duration-700"
        style={{ backgroundImage: `url(${heroBanner})` }}
      />

      {/* Text Legibility Guard: Subtle left-to-right gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />

      {/* Foreground Content */}
      <div className="relative z-10 max-w-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-4">
          🔥 LEAGUEFORGE COMPETITIVE ARENA
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight uppercase leading-none">
          COMPETE. ORGANIZE. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-sky-500">
            DOMINATE THE ARENA.
          </span>
        </h1>
        <p className="mt-4 text-slate-300 text-sm sm:text-base leading-relaxed">
          LeagueForge is a high-performance tournament management system built for Solo showdowns, Duo partnerships, and Squad battles with strict relational data isolation and real-time RBAC oversight.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link 
            to="/tournaments"
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-300 hover:to-sky-300 text-slate-950 font-bold flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/25 transform hover:-translate-y-0.5"
          >
            🏆 Browse Tournaments
          </Link>
          <Link
            to="/games"
            className="px-6 py-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-cyan-500/40 font-semibold flex items-center gap-2 transition-all backdrop-blur-md"
          >
            Explore Games &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
};

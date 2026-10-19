import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Gamepad2, Users, ArrowRight, ShieldCheck, Flame } from 'lucide-react';
import { gameService } from '../api/game.service';
import { Game } from '../types';

export const HomePage: React.FC = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    gameService
      .getAllGames()
      .then((data) => setGames(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-16 py-12 px-4 max-w-7xl mx-auto">
      {/* Hero Section */}
      <section className="relative rounded-3xl p-8 sm:p-14 overflow-hidden border border-cyan-500/20 bg-gradient-to-br from-slate-900 via-gaming-card to-slate-950 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono tracking-wider uppercase">
            <Flame className="w-3.5 h-3.5 text-cyan-400" />
            <span>Next-Gen Competitive Esports Architecture</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-heading font-extrabold text-white tracking-wide leading-tight">
            COMPETE. ORGANIZE. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">
              DOMINATE THE ARENA.
            </span>
          </h1>

          <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-2xl">
            A high-performance tournament management system built for Solo showdowns, Duo partnerships,
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

            <Link
              to="/organizer"
              className="px-6 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-white font-heading font-semibold tracking-wide flex items-center space-x-2 transition-all"
            >
              <Users className="w-5 h-5 text-cyan-400" />
              <span>Host a Tournament</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Supported Games Catalog Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white flex items-center gap-2">
              <Gamepad2 className="w-6 h-6 text-cyan-400" />
              Master Game Catalog
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Official catalog curated and governed by platform administrators.
            </p>
          </div>
          <Link
            to="/login"
            className="text-xs font-mono text-cyan-400 hover:underline flex items-center gap-1"
          >
            Explore all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-3 text-center py-12 text-slate-500">Loading catalog...</div>
          ) : games.length === 0 ? (
            <div className="col-span-3 text-center py-12 text-slate-500">No games found in catalog.</div>
          ) : (
            games.map((game) => (
              <div
                key={game.id}
                className="gaming-card rounded-2xl p-6 relative overflow-hidden group border border-slate-800 hover:border-cyan-500/40"
              >
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center text-cyan-400 font-bold font-heading text-lg group-hover:scale-105 transition-transform">
                    {game.title.slice(0, 2).toUpperCase()}
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                      game.isTeamBased
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    }`}
                  >
                    {game.isTeamBased ? 'TEAM FORMAT' : 'SOLO ONLY'}
                  </span>
                </div>

                <div className="mt-4 space-y-1">
                  <h3 className="text-lg font-heading font-bold text-white group-hover:text-cyan-400 transition-colors">
                    {game.title}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">Genre: {game.genre}</p>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span>Team Size: {game.minTeamSize}-{game.maxTeamSize}</span>
                  <span className="text-cyan-400 font-mono">
                    {game._count?.tournaments || 0} Tournaments
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

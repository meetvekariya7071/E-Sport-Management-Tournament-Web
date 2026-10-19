import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Gamepad2, ArrowRight, Flame, Users, Calendar, Sparkles } from 'lucide-react';
import { gameService } from '../api/game.service';
import { tournamentService } from '../api/tournament.service';
import { Game, Tournament } from '../types';

export const HomePage: React.FC = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      gameService.getAllGames().catch(() => []),
      tournamentService.getPublicTournaments().catch(() => [])
    ])
      .then(([gamesData, tourneysData]) => {
        setGames(gamesData || []);
        setTournaments(tourneysData || []);
      })
      .catch((err) => console.error('Failed to load homepage data:', err))
      .finally(() => setLoading(false));
  }, []);

  // Limit preview to strictly the first 3 items
  const featuredTournaments = tournaments.slice(0, 3);
  const featuredGames = games.slice(0, 3);

  const getFormatBadgeColor = (format: string) => {
    switch (format) {
      case 'SOLO':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'DUO':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'SQUAD':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      default:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'REGISTRATION_OPEN':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Open</span>;
      case 'IN_PROGRESS':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30">Live</span>;
      case 'COMPLETED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 text-slate-400 border border-slate-700">Finished</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-blue-500/10 text-blue-400 border border-blue-500/30">{status}</span>;
    }
  };

  return (
    <div className="space-y-16 py-12 px-4 max-w-7xl mx-auto">
      {/* 1. Hero Section */}
      <section className="relative rounded-3xl p-8 sm:p-14 overflow-hidden border border-cyan-500/20 bg-gradient-to-br from-slate-900 via-gaming-card to-slate-950 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

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
            and Squad battles with strict relational data isolation and real-time RBAC oversight.
          </p>

          {/* Primary CTA Only - Secondary Host Button Removed */}
          <div className="pt-4">
            <Link
              to="/tournaments"
              className="inline-flex items-center space-x-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-black font-heading font-bold tracking-wide shadow-glow-cyan transition-all transform hover:-translate-y-0.5"
            >
              <Trophy className="w-5 h-5" />
              <span>Browse Tournaments</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Featured Tournaments Section (New Home Page Section) */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white flex items-center gap-2">
              <Trophy className="w-6 h-6 text-cyan-400" />
              Featured Tournaments
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Compete in upcoming community showdowns and ranked brackets.
            </p>
          </div>
          <Link
            to="/tournaments"
            className="text-xs font-mono text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 transition-colors"
          >
            Explore all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="gaming-card h-80 rounded-2xl animate-pulse bg-slate-800/40 border border-slate-800" />
            ))}
          </div>
        ) : featuredTournaments.length === 0 ? (
          <div className="col-span-3 text-center py-12 gaming-card rounded-2xl border border-slate-800 text-slate-500">
            No active tournaments found at this moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredTournaments.map((tournament) => (
              <div
                key={tournament.id}
                className="gaming-card rounded-2xl overflow-hidden group border border-slate-800 hover:border-cyan-500/40 transition-all duration-300 flex flex-col justify-between"
              >
                {/* Banner & Header Badges */}
                <div className="relative h-44 w-full overflow-hidden bg-slate-900">
                  {tournament.bannerImage ? (
                    <img
                      src={tournament.bannerImage}
                      alt={tournament.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-cyan-400 font-bold">
                      <Trophy className="w-12 h-12 opacity-40" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                  {/* Badges on Top */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2.5 py-1 rounded-md bg-slate-950/80 backdrop-blur-md border border-slate-700/80 text-cyan-300">
                      {tournament.game?.title || 'E-Sports'}
                    </span>
                    {getStatusBadge(tournament.status)}
                  </div>

                  {/* Format Pill on Bottom */}
                  <div className="absolute bottom-3 left-3">
                    <span
                      className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border backdrop-blur-md ${getFormatBadgeColor(
                        tournament.format
                      )}`}
                    >
                      {tournament.format} FORMAT
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <h3 className="text-lg font-heading font-bold text-white group-hover:text-cyan-400 transition-colors line-clamp-1">
                      {tournament.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {tournament.description || 'Join the official competitive bracket showdown.'}
                    </p>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-800/80">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        Slots:
                      </span>
                      <span className="text-white font-mono font-semibold">
                        {tournament.currentCount} / {tournament.maxParticipants} Slots
                      </span>
                    </div>

                    {tournament.prizePool && (
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Prize Pool:</span>
                        <span className="text-cyan-400 font-mono font-semibold">
                          {tournament.prizePool}
                        </span>
                      </div>
                    )}

                    <Link
                      to={`/tournaments/${tournament.id}`}
                      className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-cyan-400 hover:text-black border border-slate-700 hover:border-cyan-400 text-white text-xs font-heading font-bold tracking-wider flex items-center justify-center space-x-2 transition-all shadow-sm group-hover:shadow-glow-cyan"
                    >
                      <span>View Tournament</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. Master Game Catalog Section (Preview 3 Games in a Single Row) */}
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
            to="/games"
            className="text-xs font-mono text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 transition-colors"
          >
            Explore all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-3 text-center py-12 text-slate-500">Loading catalog...</div>
          ) : featuredGames.length === 0 ? (
            <div className="col-span-3 text-center py-12 text-slate-500">No games found in catalog.</div>
          ) : (
            featuredGames.map((game) => (
              <div
                key={game.id}
                className="gaming-card rounded-2xl overflow-hidden group border border-slate-800 hover:border-cyan-500/40 transition-all duration-300 flex flex-col justify-between"
              >
                {/* Image Cover */}
                <div className="relative h-44 w-full overflow-hidden bg-slate-900">
                  {game.coverImage ? (
                    <img
                      src={game.coverImage}
                      alt={game.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-cyan-400 font-bold font-heading text-lg">
                      {game.title.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950/80 backdrop-blur-md border border-slate-700/80 text-slate-300">
                      {game.platform || 'PC'}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border backdrop-blur-md ${
                        game.isTeamBased
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      {game.isTeamBased ? 'TEAM FORMAT' : 'SOLO ONLY'}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block">
                      {game.genre}
                    </span>
                    <h3 className="text-lg font-heading font-bold text-white group-hover:text-cyan-400 transition-colors">
                      {game.title}
                    </h3>
                  </div>

                  <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                    <span>
                      Team Size: {game.minTeamSize === game.maxTeamSize ? game.minTeamSize : `${game.minTeamSize}-${game.maxTeamSize}`}
                    </span>
                    <span className="text-cyan-400 font-mono">
                      {game._count?.tournaments || 0} Tournaments
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

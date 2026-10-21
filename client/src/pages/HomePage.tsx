import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Gamepad2, Users, ArrowRight, Calendar, Sparkles } from 'lucide-react';
import { gameService } from '../services/game.service';
import { tournamentService } from '../services/tournament.service';
import { Game, Tournament } from '../types';
import { HeroSection } from '../components/HeroSection';

export const HomePage: React.FC = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [featuredTournaments, setFeaturedTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      gameService.getAllGames().catch(() => []),
      tournamentService.getPublicTournaments().catch(() => [])
    ])
      .then(([gamesData, tournamentsData]) => {
        setGames(gamesData || []);
        setFeaturedTournaments(tournamentsData || []);
      })
      .catch((err) => console.error('Failed to load home page data:', err))
      .finally(() => setLoading(false));
  }, []);

  const getFormatBadgeStyle = (format: string) => {
    switch (format) {
      case 'SOLO':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'DUO':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'SQUAD':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/40';
    }
  };

  // Preview strictly the first 3 items for a balanced 3-column grid
  const previewGames = (games || []).slice(0, 3);
  const previewTournaments = (featuredTournaments || []).slice(0, 3);

  return (
    <div className="space-y-16 py-12 px-4 max-w-7xl mx-auto">
      {/* Hero Section */}
      <HeroSection />

      {/* Featured Tournaments Section */}
      <section id="featured-tournaments" className="space-y-6">
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
            className="text-xs font-mono text-cyan-400 hover:underline flex items-center gap-1 group"
          >
            <span>Explore all</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-3 text-center py-12 text-slate-500 font-mono text-xs">
              Loading featured tournaments...
            </div>
          ) : previewTournaments.length === 0 ? (
            <div className="col-span-3 text-center py-12 text-slate-500 font-mono text-xs border border-slate-800 rounded-2xl">
              No tournaments currently scheduled. Check back soon!
            </div>
          ) : (
            previewTournaments.map((tournament) => {
              const capacityPercent = Math.min(
                100,
                Math.round((tournament.currentCount / tournament.maxParticipants) * 100)
              );
              const isFull = tournament.currentCount >= tournament.maxParticipants;

              return (
                <div
                  key={tournament.id}
                  className="gaming-card rounded-2xl overflow-hidden border border-slate-800 hover:border-cyan-500/50 transition-all duration-300 group flex flex-col justify-between shadow-lg hover:-translate-y-1"
                >
                  {/* Tournament Image Banner */}
                  <div className="relative h-44 w-full bg-slate-900 overflow-hidden">
                    {tournament.bannerImage ? (
                      <img
                        src={tournament.bannerImage}
                        alt={tournament.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className={`w-full h-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 ${
                        tournament.bannerImage ? 'hidden' : 'flex'
                      }`}
                    >
                      <div className="w-14 h-14 rounded-xl bg-slate-800/90 border border-slate-700 flex items-center justify-center text-cyan-400 font-bold font-heading text-xl shadow-lg">
                        <Trophy className="w-7 h-7 text-cyan-400" />
                      </div>
                    </div>

                    <div className="absolute inset-0 bg-gradient-to-t from-gaming-card via-transparent to-black/30 pointer-events-none" />

                    {/* Game Tag Badge */}
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-[11px] font-mono font-semibold text-slate-200 flex items-center gap-1.5">
                      <Gamepad2 className="w-3 h-3 text-cyan-400" />
                      <span>{tournament.game?.title || 'Competitive'}</span>
                    </div>

                    {/* Format Badge */}
                    <div
                      className={`absolute top-3 right-3 px-2.5 py-0.5 rounded-md backdrop-blur-md border text-[10px] font-mono uppercase tracking-wider font-bold ${getFormatBadgeStyle(
                        tournament.format
                      )}`}
                    >
                      {tournament.format}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          {new Date(tournament.startDate).toLocaleDateString()}
                        </span>
                        {tournament.prizePool && (
                          <span className="text-emerald-400 font-bold">
                            {tournament.prizePool}
                          </span>
                        )}
                      </div>

                      <h3 className="text-xl font-heading font-bold text-white group-hover:text-cyan-400 transition-colors line-clamp-1">
                        {tournament.title}
                      </h3>
                    </div>

                    {/* Slot Capacity & Progress */}
                    <div className="space-y-3 pt-3 border-t border-slate-800/80">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-400">Slots Remaining</span>
                          <span
                            className={`font-bold ${
                              isFull ? 'text-red-400' : 'text-cyan-400'
                            }`}
                          >
                            {tournament.currentCount}/{tournament.maxParticipants} Slots
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isFull
                                ? 'bg-red-500'
                                : 'bg-gradient-to-r from-blue-500 to-cyan-400 shadow-glow-cyan'
                            }`}
                            style={{ width: `${capacityPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* View Tournament CTA */}
                      <Link
                        to={`/tournaments/${tournament.id}`}
                        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-black font-heading font-bold text-xs uppercase tracking-wider shadow-glow-cyan text-center flex items-center justify-center gap-1.5 transition-all transform hover:-translate-y-0.5"
                      >
                        <span>View Tournament</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Master Game Catalog Section */}
      <section id="games" className="space-y-6">
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
            className="text-xs font-mono text-cyan-400 hover:underline flex items-center gap-1 group"
          >
            <span>Explore all</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-3 text-center py-12 text-slate-500 font-mono text-xs">
              Loading catalog...
            </div>
          ) : previewGames.length === 0 ? (
            <div className="col-span-3 text-center py-12 text-slate-500 font-mono text-xs border border-slate-800 rounded-2xl">
              No games found in catalog.
            </div>
          ) : (
            previewGames.map((game) => (
              <div
                key={game.id}
                className="gaming-card rounded-2xl overflow-hidden border border-slate-800 hover:border-cyan-500/50 transition-all duration-300 group flex flex-col justify-between shadow-lg hover:-translate-y-1"
              >
                {/* Game Image Banner */}
                <div className="relative h-44 w-full bg-slate-900 overflow-hidden">
                  {game.coverImage ? (
                    <img
                      src={game.coverImage}
                      alt={game.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div
                    className={`w-full h-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 ${
                      game.coverImage ? 'hidden' : 'flex'
                    }`}
                  >
                    <div className="w-14 h-14 rounded-xl bg-slate-800/90 border border-slate-700 flex items-center justify-center text-cyan-400 font-bold font-heading text-xl shadow-lg">
                      {((game && game.title) ? String(game.title) : 'UN').slice(0, 2).toUpperCase()}
                    </div>
                  </div>

                  <div className="absolute inset-0 bg-gradient-to-t from-gaming-card via-transparent to-black/30 pointer-events-none" />

                  {/* Platform Badge */}
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-[11px] font-mono font-semibold text-slate-200">
                    {game.platform || 'PC'}
                  </div>

                  {/* Team Format Badge */}
                  <div className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-cyan-500/20 backdrop-blur-md border border-cyan-500/40 text-[10px] font-mono text-cyan-300 uppercase tracking-wider font-bold">
                    {game.isTeamBased ? `Team (${game.minTeamSize}-${game.maxTeamSize})` : 'Solo'}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider">
                      {game.genre}
                    </span>
                    <h3 className="text-xl font-heading font-bold text-white group-hover:text-cyan-400 transition-colors">
                      {game.title}
                    </h3>
                  </div>

                  <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                    <span className="font-mono">Team: {game.minTeamSize}-{game.maxTeamSize}</span>
                    <Link
                      to="/tournaments"
                      className="text-cyan-400 hover:text-cyan-300 font-mono font-semibold flex items-center gap-1 transition-colors"
                    >
                      <span>{game._count?.tournaments || 0} Events</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </Link>
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

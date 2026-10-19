import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy,
  Gamepad2,
  Users,
  Search,
  Filter,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Flame,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { tournamentService } from '../api/tournament.service';
import { gameService } from '../api/game.service';
import { Tournament, Game } from '../types';
import { RegistrationModal } from '../components/RegistrationModal';

export const TournamentCatalogPage: React.FC = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedGame, setSelectedGame] = useState<string>('');
  const [selectedFormat, setSelectedFormat] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected tournament for Registration Modal
  const [activeRegTournament, setActiveRegTournament] = useState<Tournament | null>(null);

  const fetchCatalog = async () => {
    try {
      setLoading(true);
      const [tourneys, gameList] = await Promise.all([
        tournamentService.getPublicTournaments({
          gameId: selectedGame || undefined,
          format: selectedFormat || undefined,
          status: selectedStatus || undefined,
          search: searchQuery.trim() || undefined
        }),
        gameService.getAllGames().catch(() => [])
      ]);
      setTournaments(tourneys || []);
      setGames(gameList || []);
    } catch (err) {
      console.error('Failed to load tournaments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, [selectedGame, selectedFormat, selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCatalog();
  };

  const getFormatBadge = (format: string) => {
    switch (format) {
      case 'SOLO':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'DUO':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'SQUAD':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'REGISTRATION_OPEN':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'IN_PROGRESS':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'COMPLETED':
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="space-y-10 py-10 px-4 max-w-7xl mx-auto animate-fadeIn">
      {/* Catalog Hero Banner */}
      <div className="relative rounded-3xl p-8 sm:p-12 overflow-hidden border border-cyan-500/20 bg-gradient-to-br from-slate-900 via-gaming-card to-slate-950 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono tracking-wider uppercase">
            <Flame className="w-3.5 h-3.5 text-cyan-400" />
            <span>Competitive Arena Catalog</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-heading font-extrabold text-white tracking-wide leading-tight">
            EXPLORE TOURNAMENTS & <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">
              CLAIM YOUR GLORY
            </span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Browse active and upcoming esports brackets. Register Solo or mobilize your Duo / Squad teammates with instant 6-character squad invite codes.
          </p>
        </div>
      </div>

      {/* Discovery Filter & Search Bar */}
      <div className="gaming-card p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tournaments by title, game, or rules..."
              className="w-full pl-10 pr-24 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3.5 py-1 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-heading font-bold shadow-glow-cyan transition-colors"
            >
              Search
            </button>
          </form>

          {/* Filters Group */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Game Filter */}
            <div className="flex items-center space-x-1.5">
              <Gamepad2 className="w-4 h-4 text-slate-400" />
              <select
                value={selectedGame}
                onChange={(e) => setSelectedGame(e.target.value)}
                aria-label="Filter by Game"
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="">All Games</option>
                {games.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Format Filter */}
            <div className="flex items-center space-x-1.5">
              <Users className="w-4 h-4 text-slate-400" />
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
                aria-label="Filter by Format"
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="">All Formats</option>
                <option value="SOLO">SOLO (1v1)</option>
                <option value="DUO">DUO (2-Player)</option>
                <option value="SQUAD">SQUAD (4-Player)</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-1.5">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                aria-label="Filter by Status"
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="">All Statuses</option>
                <option value="REGISTRATION_OPEN">Registration Open</option>
                <option value="IN_PROGRESS">Live / In Progress</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tournament Cards Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-heading font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-cyan-400" />
            Tournament Listings ({tournaments.length})
          </h2>
          <span className="text-xs font-mono text-slate-400">
            Real-time Slot Verification Active
          </span>
        </div>

        {loading ? (
          <div className="text-center py-24 text-slate-500 space-y-3">
            <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="font-mono text-xs">Querying competitive brackets...</p>
          </div>
        ) : tournaments.length === 0 ? (
          <div className="gaming-card rounded-2xl border border-slate-800 p-12 text-center space-y-4">
            <Trophy className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="font-heading font-bold text-lg text-white">No Tournaments Found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              No tournaments match your current filter criteria. Try adjusting the game, format, or search term.
            </p>
            <button
              onClick={() => {
                setSelectedGame('');
                setSelectedFormat('');
                setSelectedStatus('');
                setSearchQuery('');
              }}
              className="px-4 py-2 text-xs font-heading font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((t) => {
              const capacityPercent = Math.min(
                100,
                Math.round((t.currentCount / t.maxParticipants) * 100)
              );
              const isFull = t.currentCount >= t.maxParticipants;
              const isOpen = t.status === 'REGISTRATION_OPEN';
              const unitLabel = t.format === 'SOLO' ? 'Players' : 'Teams';

              return (
                <div
                  key={t.id}
                  className="gaming-card rounded-2xl border border-slate-800 hover:border-cyan-500/50 flex flex-col justify-between overflow-hidden transition-all duration-300 group hover:-translate-y-1 shadow-lg"
                >
                  {/* Card Banner / Header */}
                  <div className="relative p-5 pb-3">
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${getFormatBadge(
                          t.format
                        )}`}
                      >
                        {t.format}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${getStatusBadge(
                          t.status
                        )}`}
                      >
                        {t.status.replace('_', ' ')}
                      </span>
                    </div>

                    <h3 className="font-heading font-extrabold text-lg text-white group-hover:text-cyan-400 transition-colors line-clamp-1">
                      {t.title}
                    </h3>

                    <div className="flex items-center space-x-2 text-xs text-slate-400 mt-2">
                      <Gamepad2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="font-semibold text-slate-300">
                        {t.game?.title || 'Unknown Game'}
                      </span>
                      <span>•</span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {t.game?.platform || 'PC'}
                      </span>
                    </div>

                    {t.description && (
                      <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                        {t.description}
                      </p>
                    )}
                  </div>

                  {/* Card Meta & Stats */}
                  <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-900/40 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        {new Date(t.startDate).toLocaleDateString()}
                      </span>
                      {t.prizePool && (
                        <span className="flex items-center gap-1 text-emerald-400 font-bold font-mono text-xs">
                          <Trophy className="w-3.5 h-3.5" />
                          {t.prizePool}
                        </span>
                      )}
                    </div>

                    {/* Slot Capacity Progress */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-slate-400">Roster Capacity</span>
                        <span
                          className={`font-bold ${
                            isFull ? 'text-red-400' : 'text-cyan-400'
                          }`}
                        >
                          {t.currentCount}/{t.maxParticipants} {unitLabel}
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
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="p-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-3 bg-slate-950/60">
                    <Link
                      to={`/tournaments/${t.id}`}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1"
                    >
                      <span>Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>

                    {isOpen && !isFull ? (
                      <button
                        onClick={() => setActiveRegTournament(t)}
                        className="px-4 py-1.5 text-xs font-heading font-bold rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-black shadow-glow-cyan uppercase tracking-wider transition-all"
                      >
                        Register
                      </button>
                    ) : isFull ? (
                      <span className="text-[11px] font-mono font-bold text-red-400 px-2 py-1 rounded bg-red-500/10 border border-red-500/30">
                        Slots Full
                      </span>
                    ) : (
                      <span className="text-[11px] font-mono text-slate-500">
                        Registration Closed
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Registration Modal */}
      {activeRegTournament && (
        <RegistrationModal
          isOpen={!!activeRegTournament}
          onClose={() => setActiveRegTournament(null)}
          tournament={activeRegTournament}
          onSuccess={() => {
            fetchCatalog();
          }}
        />
      )}
    </div>
  );
};

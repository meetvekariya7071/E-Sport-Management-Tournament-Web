import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy,
  Gamepad2,
  Users,
  Search,
  Calendar,
  ArrowRight,
  Flame,
  Clock,
  Play,
  Lock,
  Eye,
  CheckCircle2,
  RotateCcw
} from 'lucide-react';
import { tournamentService } from '../api/tournament.service';
import { gameService } from '../api/game.service';
import { Tournament, Game } from '../types';
import { RegistrationModal } from '../components/RegistrationModal';
import { evaluateTournamentLifecycle, getDaysUntilRegistration } from '../utils/tournamentLifecycle';

export const TournamentCatalogPage: React.FC = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedGame, setSelectedGame] = useState<string>('');
  const [selectedFormat, setSelectedFormat] = useState<string>('');
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
  }, [selectedGame, selectedFormat]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCatalog();
  };

  const handleResetFilters = () => {
    setSelectedGame('');
    setSelectedFormat('');
    setSearchQuery('');
  };

  // Group tournaments into 4 prioritized lifecycle sections
  const { liveTournaments, registrationOpenTournaments, upcomingTournaments, pastTournaments } = useMemo(() => {
    const live: Tournament[] = [];
    const regOpen: Tournament[] = [];
    const upcoming: Tournament[] = [];
    const past: Tournament[] = [];

    tournaments.forEach((t) => {
      const stage = evaluateTournamentLifecycle(t);
      if (stage === 'IN_PROGRESS') {
        live.push(t);
      } else if (stage === 'REGISTRATION_OPEN') {
        regOpen.push(t);
      } else if (stage === 'UPCOMING') {
        upcoming.push(t);
      } else {
        past.push(t);
      }
    });

    return {
      liveTournaments: live,
      registrationOpenTournaments: regOpen,
      upcomingTournaments: upcoming,
      pastTournaments: past
    };
  }, [tournaments]);

  const totalMatches =
    liveTournaments.length +
    registrationOpenTournaments.length +
    upcomingTournaments.length +
    pastTournaments.length;

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

  return (
    <div className="space-y-12 py-10 px-4 max-w-7xl mx-auto animate-fadeIn">
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
            Browse real-time esports showdowns categorized by tournament lifecycle. Spectate live brackets, secure your team roster for open events, or discover future tournaments.
          </p>
        </div>
      </div>

      {/* Discovery Filter & Search Bar */}
      <div className="gaming-card p-5 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tournaments across all categories by title, game, or rules..."
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

            {(selectedGame || selectedFormat || searchQuery) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex items-center space-x-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-24 text-slate-500 space-y-3">
          <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="font-mono text-xs">Querying competitive brackets across platform databases...</p>
        </div>
      ) : totalMatches === 0 ? (
        /* Single Centered Empty-State Container when All 4 Categories Have 0 Matches */
        <div className="gaming-card rounded-3xl border border-slate-800 p-12 sm:p-16 text-center max-w-xl mx-auto space-y-4 shadow-2xl bg-slate-900/40 animate-fadeIn my-8">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-slate-500">
            <Trophy className="w-8 h-8" />
          </div>
          <h3 className="font-heading font-extrabold text-xl text-white">
            No tournaments match your current filters.
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            We couldn't find any tournaments matching your current criteria. Try adjusting or clearing your game, format, or search filters.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-5 py-2.5 text-xs font-heading font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 hover:border-cyan-500/50 transition-all inline-flex items-center space-x-2 shadow-lg"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All Filters</span>
          </button>
        </div>
      ) : (
        <div className="space-y-16">
          {/* =========================================================================
              SECTION 1: LIVE TOURNAMENTS
              Registration Closed, Matches Running (Render only if > 0)
             ========================================================================= */}
          {liveTournaments.length > 0 && (
            <section className="space-y-6 animate-fadeIn">
              <div className="border-b border-red-500/20 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="relative flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500 shadow-glow-red"></span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-white tracking-wide flex items-center gap-2">
                      🔴 Live Tournaments
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono font-bold">
                      {liveTournaments.length}
                    </span>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Matches in progress. Spectate live brackets and leaderboard standings.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {liveTournaments.map((t) => {
                  const unitLabel = t.format === 'SOLO' ? 'Players' : 'Teams';
                  return (
                    <div
                      key={t.id}
                      className="gaming-card rounded-2xl border border-red-500/30 hover:border-red-400/60 bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 flex flex-col justify-between overflow-hidden transition-all duration-300 group hover:-translate-y-1 shadow-xl shadow-red-950/20"
                    >
                      <div className="p-5 pb-3">
                        <div className="flex items-center justify-between mb-3">
                          <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${getFormatBadge(t.format)}`}>
                            {t.format}
                          </span>
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-[10px] font-mono font-bold animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                            <span>MATCHES RUNNING</span>
                          </span>
                        </div>

                        <h3 className="font-heading font-extrabold text-lg text-white group-hover:text-red-400 transition-colors line-clamp-1">
                          {t.title}
                        </h3>

                        <div className="flex items-center space-x-2 text-xs text-slate-400 mt-2">
                          <Gamepad2 className="w-3.5 h-3.5 text-red-400 shrink-0" />
                          <span className="font-semibold text-slate-300">{t.game?.title || 'Game'}</span>
                          <span>•</span>
                          <span className="text-[11px] font-mono text-slate-400">{t.game?.platform || 'PC'}</span>
                        </div>

                        {t.description && (
                          <p className="text-xs text-slate-400 mt-2.5 line-clamp-2 leading-relaxed">
                            {t.description}
                          </p>
                        )}
                      </div>

                      <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-950/40 space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            Started {new Date(t.startDate).toLocaleDateString()}
                          </span>
                          {t.prizePool && (
                            <span className="flex items-center gap-1 text-emerald-400 font-bold font-mono text-xs">
                              <Trophy className="w-3.5 h-3.5" />
                              {t.prizePool}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                          <span>Active Competitors:</span>
                          <span className="text-white font-bold">{t.currentCount} {unitLabel} Checked-in</span>
                        </div>
                      </div>

                      <div className="p-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3 bg-slate-950/80">
                        {/* Subtle Disabled Registration Tag */}
                        <span className="inline-flex items-center space-x-1 text-[11px] font-mono text-slate-400 px-2 py-1 rounded bg-slate-800/60 border border-slate-700/60">
                          <Lock className="w-3 h-3 text-slate-400" />
                          <span>Registration Closed</span>
                        </span>

                        {/* CTA: Watch Live / Standings */}
                        <Link
                          to={`/tournaments/${t.id}/live`}
                          className="px-4 py-2 text-xs font-heading font-bold rounded-xl bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white shadow-glow-red flex items-center space-x-1.5 transition-all"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Watch Live / Standings</span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* =========================================================================
              SECTION 2: REGISTRATION OPEN TOURNAMENTS
              Upcoming & Open for Entry (Render only if > 0)
             ========================================================================= */}
          {registrationOpenTournaments.length > 0 && (
            <section className="space-y-6 animate-fadeIn">
              <div className="border-b border-emerald-500/20 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 shadow-glow-emerald"></div>
                    <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-white tracking-wide flex items-center gap-2">
                      🟢 Registration Open
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
                      {registrationOpenTournaments.length}
                    </span>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Claim your slot. Solo check-in and Duo/Squad team formation active.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {registrationOpenTournaments.map((t) => {
                  const capacityPercent = Math.min(100, Math.round((t.currentCount / t.maxParticipants) * 100));
                  const isFull = t.currentCount >= t.maxParticipants;
                  const unitLabel = t.format === 'SOLO' ? 'Players' : 'Teams';

                  return (
                    <div
                      key={t.id}
                      className="gaming-card rounded-2xl border border-emerald-500/30 hover:border-emerald-400/60 bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 flex flex-col justify-between overflow-hidden transition-all duration-300 group hover:-translate-y-1 shadow-xl shadow-emerald-950/20"
                    >
                      <div className="p-5 pb-3">
                        <div className="flex items-center justify-between mb-3">
                          <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${getFormatBadge(t.format)}`}>
                            {t.format}
                          </span>
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            <span>ENTRY OPEN</span>
                          </span>
                        </div>

                        <h3 className="font-heading font-extrabold text-lg text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                          {t.title}
                        </h3>

                        <div className="flex items-center space-x-2 text-xs text-slate-400 mt-2">
                          <Gamepad2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="font-semibold text-slate-300">{t.game?.title || 'Game'}</span>
                          <span>•</span>
                          <span className="text-[11px] font-mono text-slate-400">{t.game?.platform || 'PC'}</span>
                        </div>

                        {t.description && (
                          <p className="text-xs text-slate-400 mt-2.5 line-clamp-2 leading-relaxed">
                            {t.description}
                          </p>
                        )}
                      </div>

                      <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-950/40 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            Starts {new Date(t.startDate).toLocaleDateString()}
                          </span>
                          {t.prizePool && (
                            <span className="flex items-center gap-1 text-emerald-400 font-bold font-mono text-xs">
                              <Trophy className="w-3.5 h-3.5" />
                              {t.prizePool}
                            </span>
                          )}
                        </div>

                        {/* Active capacity indicator */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-slate-400">Capacity Indicator</span>
                            <span className={`font-bold ${isFull ? 'text-red-400' : 'text-emerald-400'}`}>
                              {t.currentCount}/{t.maxParticipants} {unitLabel} Filled
                            </span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isFull ? 'bg-red-500' : 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                              }`}
                              style={{ width: `${capacityPercent}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3 bg-slate-950/80">
                        <Link
                          to={`/tournaments/${t.id}`}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1"
                        >
                          <span>Rules & Info</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>

                        {isFull ? (
                          <span className="text-[11px] font-mono font-bold text-red-400 px-3 py-1.5 rounded bg-red-500/10 border border-red-500/30">
                            Slots Filled
                          </span>
                        ) : (
                          <button
                            onClick={() => setActiveRegTournament(t)}
                            className="px-5 py-2 text-xs font-heading font-extrabold rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-black shadow-glow-emerald uppercase tracking-wider transition-all"
                          >
                            REGISTER NOW
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* =========================================================================
              SECTION 3: FUTURE TOURNAMENTS
              Announced / Opening Soon (Render only if > 0)
             ========================================================================= */}
          {upcomingTournaments.length > 0 && (
            <section className="space-y-6 animate-fadeIn">
              <div className="border-b border-amber-500/20 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-white tracking-wide flex items-center gap-2">
                      ⏳ Opening Soon
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold">
                      {upcomingTournaments.length}
                    </span>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Upcoming tournament announcements. Registration opens soon.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingTournaments.map((t) => {
                  const daysLeft = getDaysUntilRegistration(t.registrationStartDate);
                  const countdownText =
                    daysLeft > 1
                      ? `Registration opens in ${daysLeft} days`
                      : daysLeft === 1
                      ? `Registration opens tomorrow`
                      : `Registration opens today`;

                  return (
                    <div
                      key={t.id}
                      className="gaming-card rounded-2xl border border-amber-500/30 hover:border-amber-400/60 bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 flex flex-col justify-between overflow-hidden transition-all duration-300 group hover:-translate-y-1 shadow-xl shadow-amber-950/20"
                    >
                      <div className="p-5 pb-3">
                        <div className="flex items-center justify-between mb-3">
                          <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${getFormatBadge(t.format)}`}>
                            {t.format}
                          </span>
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-bold">
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>ANNOUNCED</span>
                          </span>
                        </div>

                        <h3 className="font-heading font-extrabold text-lg text-white group-hover:text-amber-400 transition-colors line-clamp-1">
                          {t.title}
                        </h3>

                        <div className="flex items-center space-x-2 text-xs text-slate-400 mt-2">
                          <Gamepad2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="font-semibold text-slate-300">{t.game?.title || 'Game'}</span>
                          <span>•</span>
                          <span className="text-[11px] font-mono text-slate-400">{t.game?.platform || 'PC'}</span>
                        </div>

                        {t.description && (
                          <p className="text-xs text-slate-400 mt-2.5 line-clamp-2 leading-relaxed">
                            {t.description}
                          </p>
                        )}
                      </div>

                      <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-950/40 space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            Starts {new Date(t.startDate).toLocaleDateString()}
                          </span>
                          {t.prizePool && (
                            <span className="flex items-center gap-1 text-amber-400 font-bold font-mono text-xs">
                              <Trophy className="w-3.5 h-3.5" />
                              {t.prizePool}
                            </span>
                          )}
                        </div>

                        {/* Countdown Tag */}
                        <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                          <span className="text-[11px] font-mono font-bold text-amber-300">
                            ⏳ {countdownText}
                          </span>
                        </div>
                      </div>

                      <div className="p-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3 bg-slate-950/80">
                        <span className="text-[11px] font-mono text-slate-400">
                          Max: {t.maxParticipants} slots
                        </span>

                        {/* CTA: View Rules & Schedule */}
                        <Link
                          to={`/tournaments/${t.id}`}
                          className="px-4 py-2 text-xs font-heading font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 flex items-center space-x-1.5 transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Rules & Schedule</span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* =========================================================================
              SECTION 4: PAST TOURNAMENTS
              Completed Showdowns (Render only if > 0)
             ========================================================================= */}
          {pastTournaments.length > 0 && (
            <section className="space-y-6 animate-fadeIn">
              <div className="border-b border-slate-700/60 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Trophy className="w-4 h-4 text-slate-400" />
                    <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-white tracking-wide flex items-center gap-2">
                      🏁 Past Showdowns
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono font-bold">
                      {pastTournaments.length}
                    </span>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Concluded events, historical brackets, and champion records.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pastTournaments.map((t) => (
                  <div
                    key={t.id}
                    className="gaming-card rounded-2xl border border-slate-800 hover:border-slate-700 bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 flex flex-col justify-between overflow-hidden transition-all duration-300 group hover:-translate-y-1 shadow-lg"
                  >
                    <div className="p-5 pb-3">
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${getFormatBadge(t.format)}`}>
                          {t.format}
                        </span>
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-mono font-bold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>CONCLUDED</span>
                        </span>
                      </div>

                      <h3 className="font-heading font-extrabold text-lg text-white group-hover:text-cyan-400 transition-colors line-clamp-1">
                        {t.title}
                      </h3>

                      <div className="flex items-center space-x-2 text-xs text-slate-400 mt-2">
                        <Gamepad2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-300">{t.game?.title || 'Game'}</span>
                        <span>•</span>
                        <span className="text-[11px] font-mono text-slate-400">{t.game?.platform || 'PC'}</span>
                      </div>

                      {t.description && (
                        <p className="text-xs text-slate-400 mt-2.5 line-clamp-2 leading-relaxed">
                          {t.description}
                        </p>
                      )}
                    </div>

                    <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-950/40 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          Ended {t.endDate ? new Date(t.endDate).toLocaleDateString() : new Date(t.startDate).toLocaleDateString()}
                        </span>
                        {t.prizePool && (
                          <span className="flex items-center gap-1 text-slate-300 font-bold font-mono text-xs">
                            <Trophy className="w-3.5 h-3.5 text-amber-400" />
                            {t.prizePool}
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] font-mono text-slate-400">
                        Total Competitors: <span className="text-white font-bold">{t.currentCount}</span>
                      </div>
                    </div>

                    <div className="p-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3 bg-slate-950/80">
                      <span className="text-[11px] font-mono text-slate-400">
                        Official Champion Crowned
                      </span>

                      {/* CTA: View Results */}
                      <Link
                        to={`/tournaments/${t.id}`}
                        className="px-4 py-2 text-xs font-heading font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 border border-slate-700 flex items-center space-x-1.5 transition-all"
                      >
                        <Trophy className="w-3.5 h-3.5 text-amber-400" />
                        <span>View Results</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

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

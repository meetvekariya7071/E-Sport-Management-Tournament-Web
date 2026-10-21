import React, { useEffect, useState, useMemo } from 'react';
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
  Clock,
  Radio,
  Eye,
  RotateCcw
} from 'lucide-react';
import { tournamentService } from '../services/tournament.service';
import { gameService } from '../services/game.service';
import { Tournament, Game, TournamentLifecycle } from '../types';
import { getTournamentLifecycleStatus } from '../utils/tournamentLifecycle';
import { RegistrationModal } from '../components/RegistrationModal';

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
      setTournaments(Array.isArray(tourneys) ? tourneys : []);
      setGames(Array.isArray(gameList) ? gameList : []);
    } catch (err) {
      console.error('Failed to load tournaments:', err);
      setTournaments([]);
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

  // Helper to categorize each tournament
  const getLifecycle = (t: Tournament): TournamentLifecycle => {
    if (t.lifecycleStatus) return t.lifecycleStatus;
    return getTournamentLifecycleStatus(t);
  };

  // Filter tournaments client-side for responsive search
  const filteredTournaments = useMemo(() => {
    const list = Array.isArray(tournaments) ? tournaments : [];
    return list.filter((t) => {
      // Game filter
      if (selectedGame && t.gameId !== selectedGame && t.game?.id !== selectedGame) {
        return false;
      }
      // Format filter
      if (selectedFormat && t.format !== selectedFormat) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = (t.title || '').toLowerCase().includes(q);
        const descMatch = (t.description || '').toLowerCase().includes(q);
        const gameMatch = (t.game?.title || '').toLowerCase().includes(q);
        if (!titleMatch && !descMatch && !gameMatch) {
          return false;
        }
      }
      return true;
    });
  }, [tournaments, selectedGame, selectedFormat, searchQuery]);

  // Priority partitioned sections
  const liveTournaments = useMemo(
    () => filteredTournaments.filter((t) => getLifecycle(t) === 'LIVE'),
    [filteredTournaments]
  );

  const regOpenTournaments = useMemo(
    () => filteredTournaments.filter((t) => getLifecycle(t) === 'REGISTRATION_OPEN'),
    [filteredTournaments]
  );

  const futureTournaments = useMemo(
    () => filteredTournaments.filter((t) => getLifecycle(t) === 'FUTURE'),
    [filteredTournaments]
  );

  const pastTournaments = useMemo(
    () => filteredTournaments.filter((t) => getLifecycle(t) === 'PAST'),
    [filteredTournaments]
  );

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

  const getCountdownString = (regStartDate?: string): string => {
    if (!regStartDate) return 'Registration opens soon';
    const target = new Date(regStartDate).getTime();
    const now = Date.now();
    const diffMs = target - now;
    if (diffMs <= 0) return 'Registration opens today';

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 24) {
      return `Registration opens in ${Math.max(1, diffHours)}h`;
    }
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return `Registration opens in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
  };

  // Render individual tournament card based on category
  const renderTournamentCard = (
    t: Tournament,
    category: 'LIVE' | 'REGISTRATION_OPEN' | 'FUTURE' | 'PAST'
  ) => {
    const unitLabel = t.format === 'SOLO' ? 'Players' : 'Teams';
    const capacityPercent = Math.min(
      100,
      Math.round(((t.currentCount || 0) / (t.maxParticipants || 1)) * 100)
    );
    const isFull = (t.currentCount || 0) >= (t.maxParticipants || 1);

    return (
      <div
        key={t.id}
        className={`gaming-card rounded-2xl border flex flex-col justify-between overflow-hidden transition-all duration-300 group hover:-translate-y-1 shadow-xl ${
          category === 'LIVE'
            ? 'border-red-500/30 hover:border-red-500/60 shadow-red-950/20'
            : category === 'REGISTRATION_OPEN'
            ? 'border-emerald-500/30 hover:border-emerald-400/60 shadow-emerald-950/20'
            : category === 'FUTURE'
            ? 'border-amber-500/30 hover:border-amber-400/60 shadow-amber-950/20'
            : 'border-slate-800 hover:border-slate-700 shadow-black/40'
        }`}
      >
        {/* Banner Image or Top Color Bar */}
        <div className="relative h-28 w-full bg-slate-900 overflow-hidden">
          {t.bannerImage ? (
            <img
              src={t.bannerImage}
              alt={t.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex items-center justify-center">
              <Trophy className="w-10 h-10 text-slate-700/60" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent"></div>

          {/* Badges Overlay */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
            <span
              className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider backdrop-blur-md ${getFormatBadge(
                t.format
              )}`}
            >
              {t.format}
            </span>

            {category === 'LIVE' && (
              <span className="flex items-center space-x-1.5 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 backdrop-blur-md animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                <span>MATCHES LIVE</span>
              </span>
            )}
            {category === 'REGISTRATION_OPEN' && (
              <span className="flex items-center space-x-1.5 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 backdrop-blur-md">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>ENTRY OPEN</span>
              </span>
            )}
            {category === 'FUTURE' && (
              <span className="flex items-center space-x-1.5 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 backdrop-blur-md">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>UPCOMING</span>
              </span>
            )}
            {category === 'PAST' && (
              <span className="flex items-center space-x-1.5 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700 backdrop-blur-md">
                <CheckCircle2 className="w-3 h-3 text-slate-400" />
                <span>CONCLUDED</span>
              </span>
            )}
          </div>
        </div>

        {/* Card Body */}
        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1.5">
              <Gamepad2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="font-semibold text-slate-200">
                {t.game?.title || 'Competitive Title'}
              </span>
              <span>•</span>
              <span className="text-[11px] font-mono text-slate-400">
                {t.game?.platform || 'PC'}
              </span>
            </div>

            <h3 className="font-heading font-extrabold text-lg text-white group-hover:text-cyan-400 transition-colors line-clamp-1">
              {t.title}
            </h3>

            {t.description && (
              <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                {t.description}
              </p>
            )}
          </div>

          {/* Meta & Metrics */}
          <div className="space-y-3 pt-3 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                {t.startDate ? new Date(t.startDate).toLocaleDateString() : 'TBD'}
              </span>
              {t.prizePool && (
                <span className="flex items-center gap-1 text-emerald-400 font-bold font-mono text-xs">
                  <Trophy className="w-3.5 h-3.5" />
                  {t.prizePool}
                </span>
              )}
            </div>

            {/* Capacity or Countdown Indicator */}
            {category === 'REGISTRATION_OPEN' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">Roster Capacity</span>
                  <span
                    className={`font-bold ${
                      isFull ? 'text-red-400' : 'text-emerald-400'
                    }`}
                  >
                    {t.currentCount || 0}/{t.maxParticipants} {unitLabel} Filled
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isFull
                        ? 'bg-red-500'
                        : 'bg-gradient-to-r from-emerald-500 to-cyan-400 shadow-glow-cyan'
                    }`}
                    style={{ width: `${capacityPercent}%` }}
                  ></div>
                </div>
              </div>
            )}

            {category === 'FUTURE' && (
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs">
                <span className="text-[11px] font-mono text-amber-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  {getCountdownString(t.registrationStartDate)}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Cap: {t.maxParticipants} {unitLabel}
                </span>
              </div>
            )}

            {category === 'LIVE' && (
              <div className="p-2 rounded-xl bg-red-950/30 border border-red-500/20 flex items-center justify-between text-xs">
                <span className="text-[11px] font-mono text-red-300 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                  Live Bracket In Progress
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {t.currentCount || 0} {unitLabel} Competing
                </span>
              </div>
            )}

            {category === 'PAST' && (
              <div className="p-2 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between text-xs">
                <span className="text-[11px] font-mono text-slate-300 flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  Champion Verified
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {t.currentCount || 0} {unitLabel} Showdown
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Card Actions Footer */}
        <div className="p-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-3 bg-slate-950/60">
          {category === 'LIVE' && (
            <>
              <Link
                to={`/tournaments/${t.id}/live`}
                className="flex-1 py-2 px-3 text-xs font-heading font-bold rounded-xl bg-red-600 hover:bg-red-500 text-white flex items-center justify-center gap-1.5 shadow-lg shadow-red-900/30 transition-all"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Watch Live / Standings</span>
              </Link>
              <span className="text-[11px] font-mono text-slate-500 px-2 py-1 rounded bg-slate-900/80 border border-slate-800 shrink-0">
                Registration Closed
              </span>
            </>
          )}

          {category === 'REGISTRATION_OPEN' && (
            <>
              <Link
                to={`/tournaments/${t.id}`}
                className="px-3 py-2 text-xs font-semibold rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1"
              >
                <span>Details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              {!isFull ? (
                <button
                  onClick={() => setActiveRegTournament(t)}
                  className="flex-1 py-2 px-4 text-xs font-heading font-extrabold rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 uppercase tracking-wider shadow-glow-cyan transition-all"
                >
                  REGISTER NOW
                </button>
              ) : (
                <span className="text-xs font-mono font-bold text-red-400 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/30">
                  Slots Full
                </span>
              )}
            </>
          )}

          {category === 'FUTURE' && (
            <>
              <Link
                to={`/tournaments/${t.id}`}
                className="flex-1 py-2 px-3 text-xs font-heading font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 hover:border-cyan-500/40 flex items-center justify-center gap-1.5 transition-all"
              >
                <span>View Rules & Schedule</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </>
          )}

          {category === 'PAST' && (
            <>
              <Link
                to={`/tournaments/${t.id}`}
                className="flex-1 py-2 px-3 text-xs font-heading font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 flex items-center justify-center gap-1.5 transition-all"
              >
                <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                <span>View Results</span>
              </Link>
            </>
          )}
        </div>
      </div>
    );
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
            Browse live brackets, claim registration slots in open tournaments, preview upcoming majors, and inspect historical champion archives.
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

            {/* Reset Filters */}
            {(selectedGame || selectedFormat || searchQuery) && (
              <button
                onClick={handleResetFilters}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-colors"
                title="Reset all filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-28 text-slate-500 space-y-4">
          <div className="w-12 h-12 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="font-mono text-xs tracking-wider uppercase text-slate-400">
            Querying tournament lifecycle databases...
          </p>
        </div>
      ) : (
        <div className="space-y-16">
          {/* =========================================================================
              SECTION 1: LIVE TOURNAMENTS (Registration Closed, Matches Running)
             ========================================================================= */}
          {liveTournaments.length > 0 && (
            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-red-500/20 pb-4">
                <div>
                  <div className="flex items-center space-x-3">
                    <span className="relative flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500"></span>
                    </span>
                    <h2 className="text-2xl font-heading font-extrabold text-white tracking-wide">
                      🔴 Live Tournaments
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-red-500/10 text-red-400 border border-red-500/30">
                      {liveTournaments.length} ACTIVE
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs sm:text-sm mt-1">
                    Matches in progress. Spectate live brackets and leaderboard standings.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {liveTournaments.map((t) => renderTournamentCard(t, 'LIVE'))}
              </div>
            </section>
          )}

          {/* =========================================================================
              SECTION 2: REGISTRATION OPEN TOURNAMENTS (Upcoming & Open for Entry)
             ========================================================================= */}
          {regOpenTournaments.length > 0 && (
            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-500/20 pb-4">
                <div>
                  <div className="flex items-center space-x-3">
                    <span className="relative flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                    </span>
                    <h2 className="text-2xl font-heading font-extrabold text-white tracking-wide">
                      🟢 Registration Open
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      {regOpenTournaments.length} OPEN
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs sm:text-sm mt-1">
                    Claim your slot. Solo check-in and Duo/Squad team formation active.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {regOpenTournaments.map((t) => renderTournamentCard(t, 'REGISTRATION_OPEN'))}
              </div>
            </section>
          )}

          {/* =========================================================================
              SECTION 3: FUTURE TOURNAMENTS (Announced / Opening Soon)
             ========================================================================= */}
          {futureTournaments.length > 0 && (
            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-500/20 pb-4">
                <div>
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">⏳</span>
                    <h2 className="text-2xl font-heading font-extrabold text-white tracking-wide">
                      Opening Soon
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      {futureTournaments.length} ANNOUNCED
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs sm:text-sm mt-1">
                    Upcoming tournament announcements. Registration opens soon.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {futureTournaments.map((t) => renderTournamentCard(t, 'FUTURE'))}
              </div>
            </section>
          )}

          {/* =========================================================================
              SECTION 4: PAST TOURNAMENTS (Completed Showdowns)
             ========================================================================= */}
          {pastTournaments.length > 0 && (
            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/60 pb-4">
                <div>
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">🏁</span>
                    <h2 className="text-2xl font-heading font-extrabold text-white tracking-wide">
                      Past Showdowns
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-700/40 text-slate-300 border border-slate-700">
                      {pastTournaments.length} ARCHIVED
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs sm:text-sm mt-1">
                    Concluded events, historical brackets, and champion records.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pastTournaments.map((t) => renderTournamentCard(t, 'PAST'))}
              </div>
            </section>
          )}

          {/* Single centered placeholder if all four categories are empty */}
          {liveTournaments.length === 0 &&
            regOpenTournaments.length === 0 &&
            futureTournaments.length === 0 &&
            pastTournaments.length === 0 && (
              <div className="gaming-card rounded-3xl border border-slate-800 p-12 text-center space-y-4 bg-slate-900/40 max-w-lg mx-auto my-12">
                <Trophy className="w-12 h-12 text-slate-600 mx-auto" />
                <h3 className="font-heading font-bold text-lg text-slate-200">
                  No tournaments found matching your filters.
                </h3>
                <p className="text-xs text-slate-400">
                  Try adjusting your search query, changing game or format filters, or reset filters to browse all tournaments.
                </p>
                {(selectedGame || selectedFormat || searchQuery) && (
                  <button
                    onClick={handleResetFilters}
                    className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-heading font-bold transition-all shadow-glow-cyan"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
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

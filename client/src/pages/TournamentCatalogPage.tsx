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
import { TournamentCard } from '../components/common/TournamentCard';
const heroBanner = '/images/hero-banner.jpg';

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



  // Render individual tournament card based on category
  const renderTournamentCard = (
    t: Tournament,
    category: 'LIVE' | 'REGISTRATION_OPEN' | 'FUTURE' | 'PAST'
  ) => {
    return (
      <TournamentCard
        key={t.id}
        tournament={t}
        category={category}
        onRegister={setActiveRegTournament}
      />
    );
  };

  return (
    <div className="space-y-12 py-10 px-4 max-w-7xl mx-auto animate-fadeIn">
      {/* Catalog Hero Banner */}
      <div className="relative w-full overflow-hidden rounded-3xl p-8 md:p-12 border border-emerald-500/30 bg-slate-950 shadow-[0_0_50px_-15px_rgba(16,185,129,0.3)]">
        {/* Shared Arena Backdrop Layer */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-60 md:opacity-70 scale-105 pointer-events-none transition-all duration-700"
          style={{ backgroundImage: `url(${heroBanner})` }}
        />

        {/* Directional Gradient Scrim: Crisp Readability Guard */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/75 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />

        {/* Radiant Emerald Accent Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono tracking-wider uppercase">
            <Flame className="w-3.5 h-3.5 text-emerald-400" />
            <span>Competitive Arena Catalog</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-heading font-extrabold text-white tracking-wide leading-tight">
            EXPLORE TOURNAMENTS & <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
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

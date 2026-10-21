import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Gamepad2,
  Trophy,
  Users,
  Monitor,
  Smartphone,
  Globe,
  ArrowLeft,
  Calendar,
  Sparkles,
  Flame,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { gameService } from '../services/game.service';
import { tournamentService } from '../services/tournament.service';
import { Game, Tournament } from '../types';
import { TournamentCard } from '../components/common/TournamentCard';
import { RegistrationModal } from '../components/RegistrationModal';

export const GameDetailPage: React.FC = () => {
  const { idOrSlug } = useParams<{ idOrSlug: string }>();
  const [game, setGame] = useState<Game | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<'ALL' | 'LIVE' | 'REGISTRATION_OPEN' | 'FUTURE' | 'PAST'>('ALL');

  // Selected tournament for Registration Modal
  const [activeRegTournament, setActiveRegTournament] = useState<Tournament | null>(null);

  useEffect(() => {
    if (!idOrSlug) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    gameService
      .getGameByIdOrSlug(idOrSlug)
      .then(async (gameData) => {
        if (!isMounted) return;
        setGame(gameData);

        // If tournaments were returned with the game, use them; otherwise fetch explicitly
        if (gameData?.tournaments && Array.isArray(gameData.tournaments) && gameData.tournaments.length > 0) {
          setTournaments(gameData.tournaments);
        } else if (gameData?.id) {
          try {
            const publicTourneys = await tournamentService.getPublicTournaments({ gameId: gameData.id });
            if (isMounted) {
              setTournaments(Array.isArray(publicTourneys) ? publicTourneys : []);
            }
          } catch (tErr) {
            console.error('Failed to fetch tournaments for game:', tErr);
          }
        }
      })
      .catch((err: any) => {
        if (!isMounted) return;
        console.error('Failed to load game details:', err);
        setError(err.response?.data?.error || err.message || 'Game not found');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [idOrSlug]);

  const getPlatformIcon = (platform?: string) => {
    const p = (platform || '').toLowerCase();
    if (p.includes('mobile')) return <Smartphone className="w-4 h-4 text-emerald-400" />;
    if (p.includes('cross')) return <Globe className="w-4 h-4 text-cyan-400" />;
    return <Monitor className="w-4 h-4 text-blue-400" />;
  };

  if (loading) {
    return (
      <div className="text-center py-24 text-slate-500 space-y-3">
        <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="font-mono text-xs">Loading game details & tournament schedule...</p>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="text-center py-20 space-y-4 max-w-md mx-auto">
        <div className="text-red-400 text-lg font-bold">{error || 'Game Not Found'}</div>
        <p className="text-xs text-slate-400">The game you are looking for may have been removed or does not exist.</p>
        <Link
          to="/games"
          className="px-4 py-2 rounded-xl bg-slate-800 text-cyan-400 hover:underline text-xs font-mono inline-block"
        >
          &larr; Return to Games Catalog
        </Link>
      </div>
    );
  }

  const heroBackground =
    game.coverImage ||
    game.coverImageUrl ||
    game.bannerUrl ||
    '/images/hero-banner.jpg';

  // Filter tournaments by tab
  const filteredTournaments = tournaments.filter((t) => {
    if (filterTab === 'ALL') return true;
    const lifecycle = t.lifecycleStatus || (t as any).category;
    if (filterTab === 'LIVE') return lifecycle === 'LIVE' || t.status === 'IN_PROGRESS';
    if (filterTab === 'REGISTRATION_OPEN') return lifecycle === 'REGISTRATION_OPEN' || t.status === 'REGISTRATION_OPEN';
    if (filterTab === 'FUTURE') return lifecycle === 'FUTURE' || t.status === 'DRAFT';
    if (filterTab === 'PAST') return lifecycle === 'PAST' || t.status === 'COMPLETED' || t.status === 'CANCELLED';
    return true;
  });

  const totalTournamentsCount = game.stats?.totalTournaments ?? tournaments.length;
  const activeTournamentsCount =
    game.stats?.activeTournaments ??
    tournaments.filter((t) => t.status === 'REGISTRATION_OPEN' || t.status === 'IN_PROGRESS').length;
  const totalParticipantsCount =
    game.stats?.totalParticipants ??
    tournaments.reduce((sum, t) => sum + (t.currentCount || 0), 0);
  const totalPrizePoolText = game.stats?.totalPrizePool ?? 'Active Prize Pools';

  return (
    <div className="space-y-10 max-w-7xl mx-auto py-8 px-4 animate-fadeIn">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/games"
          className="text-xs font-mono text-cyan-400 hover:underline inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Official Games Catalog
        </Link>

        <div className="flex items-center gap-2">
          <Link
            to="/tournaments"
            className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors"
          >
            All Tournaments &rarr;
          </Link>
        </div>
      </div>

      {/* Hero Banner Section with Dynamic Cover Background */}
      <div className="relative w-full overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 p-6 sm:p-10 shadow-2xl">
        {/* Dynamic Background Image Layer with Esports Gradient Overlay */}
        <img
          src={heroBackground}
          alt={game.title}
          className="absolute inset-0 w-full h-full object-cover opacity-35 mix-blend-luminosity scale-105 pointer-events-none transition-all duration-700"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/images/hero-banner.jpg';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent pointer-events-none" />

        {/* Foreground Hero Content */}
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="max-w-2xl space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold font-mono uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-cyan-400" />
                <span>{game.genre}</span>
              </span>

              <span className="px-3 py-1 rounded-full bg-slate-800/90 border border-slate-700/80 text-slate-200 text-xs font-mono font-medium flex items-center gap-1.5">
                {getPlatformIcon(game.platform)}
                <span>{game.platform || 'PC'}</span>
              </span>

              <span className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-mono font-bold uppercase">
                {game.isTeamBased ? `Team Format: ${game.minTeamSize}-${game.maxTeamSize} Players` : 'Solo Format Only'}
              </span>

              {game.isActive !== false ? (
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ACTIVE CATALOG
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  ARCHIVED
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white uppercase tracking-tight leading-none">
              {game.title}
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Official title in the LeagueForge competitive catalog. Compete in community tournaments, climb the leaderboards, and qualify for championship prize pools.
            </p>
          </div>

          {/* Quick Stats Panel */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full lg:w-auto shrink-0">
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/90 backdrop-blur-md text-center">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                Total Tournaments
              </span>
              <span className="text-2xl font-black font-mono text-cyan-400 mt-1 block">
                {totalTournamentsCount}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/90 backdrop-blur-md text-center">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                Active / Running
              </span>
              <span className="text-2xl font-black font-mono text-emerald-400 mt-1 block">
                {activeTournamentsCount}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/90 backdrop-blur-md text-center col-span-2 sm:col-span-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                Total Participants
              </span>
              <span className="text-2xl font-black font-mono text-purple-300 mt-1 block">
                {totalParticipantsCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Associated Tournaments Section */}
      <section className="space-y-6 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white flex items-center gap-2">
              <Trophy className="w-6 h-6 text-cyan-400" />
              Tournaments for {game.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Select any tournament card below to inspect rules, view bracket standings, or claim a roster slot.
            </p>
          </div>

          {/* Lifecycle Filter Tabs */}
          <div className="flex items-center space-x-1.5 overflow-x-auto p-1 rounded-xl bg-slate-900/90 border border-slate-800">
            {(['ALL', 'LIVE', 'REGISTRATION_OPEN', 'FUTURE', 'PAST'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold uppercase tracking-wider transition-colors whitespace-nowrap ${
                  filterTab === tab
                    ? 'bg-cyan-400 text-slate-950 font-bold shadow-glow-cyan'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {tab === 'ALL'
                  ? 'All Events'
                  : tab === 'REGISTRATION_OPEN'
                  ? 'Open'
                  : tab === 'FUTURE'
                  ? 'Upcoming'
                  : tab === 'PAST'
                  ? 'Past'
                  : 'Live'}
              </button>
            ))}
          </div>
        </div>

        {/* Tournaments Grid */}
        {filteredTournaments.length === 0 ? (
          <div className="text-center py-16 text-slate-400 border border-slate-800 rounded-3xl bg-gaming-card/40 p-8">
            <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-base font-semibold text-white">
              No active or upcoming tournaments scheduled for this game yet.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Organizers can launch competitive tournaments for {game.title} anytime from their Organizer Dashboard.
            </p>
            <div className="mt-6">
              <Link
                to="/tournaments"
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-mono inline-flex items-center gap-2 transition-colors border border-slate-700"
              >
                <span>Browse other tournaments</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTournaments.map((tournament) => (
              <TournamentCard
                key={tournament.id}
                tournament={tournament}
                onRegister={(t) => setActiveRegTournament(t)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Registration Modal for direct registration from TournamentCard */}
      {activeRegTournament && (
        <RegistrationModal
          isOpen={!!activeRegTournament}
          onClose={() => setActiveRegTournament(null)}
          tournament={activeRegTournament}
          onSuccess={() => {
            setActiveRegTournament(null);
            // Refresh game details
            if (idOrSlug) {
              gameService.getGameByIdOrSlug(idOrSlug).then((updated) => {
                setGame(updated);
                if (updated?.tournaments) setTournaments(updated.tournaments);
              });
            }
          }}
        />
      )}
    </div>
  );
};

export default GameDetailPage;

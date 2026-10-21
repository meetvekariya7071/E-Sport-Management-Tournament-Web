import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Trophy, Gamepad2, Users, ArrowRight, Calendar, Sparkles, CheckCircle2 } from 'lucide-react';
import { gameService } from '../services/game.service';
import { tournamentService } from '../services/tournament.service';
import { Game, Tournament } from '../types';
import { HeroSection } from '../components/HeroSection';
import { TournamentCard } from '../components/common/TournamentCard';
import { GameCard } from '../components/common/GameCard';

export const HomePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showDeletedToast, setShowDeletedToast] = useState(
    searchParams.get('deleted') === 'true'
  );
  const [games, setGames] = useState<Game[]>([]);
  const [featuredTournaments, setFeaturedTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (searchParams.get('deleted') === 'true') {
      setShowDeletedToast(true);
      const timer = setTimeout(() => {
        setShowDeletedToast(false);
        searchParams.delete('deleted');
        setSearchParams(searchParams, { replace: true });
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, setSearchParams]);

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
      {/* Account Deletion Confirmation Toast */}
      {showDeletedToast && (
        <div className="fixed top-20 right-6 z-50 flex items-center space-x-3 bg-red-950/95 border border-red-500/50 text-red-300 px-5 py-3.5 rounded-2xl shadow-[0_0_30px_rgba(239,68,68,0.3)] backdrop-blur-md animate-slide-in">
          <CheckCircle2 className="w-5 h-5 text-red-400 shrink-0" />
          <span className="text-sm font-medium">Your account has been deleted.</span>
          <button
            onClick={() => {
              setShowDeletedToast(false);
              searchParams.delete('deleted');
              setSearchParams(searchParams, { replace: true });
            }}
            className="text-red-400/70 hover:text-red-200 text-xs ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

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
            previewTournaments.map((tournament) => (
              <TournamentCard key={tournament.id} tournament={tournament} />
            ))
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
              <GameCard key={game.id} game={game} />
            ))
          )}
        </div>
      </section>
    </div>
  );
};

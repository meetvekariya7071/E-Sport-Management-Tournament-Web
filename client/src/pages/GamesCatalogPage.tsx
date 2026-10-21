import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Gamepad2, Trophy, Users, Monitor, Smartphone, Globe, Search, ArrowRight, Sparkles } from 'lucide-react';
import { gameService } from '../services/game.service';
import { Game } from '../types';

export const GamesCatalogPage: React.FC = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('ALL');
  const [genreFilter, setGenreFilter] = useState('ALL');
  const navigate = useNavigate();

  useEffect(() => {
    gameService
      .getAllGames()
      .then((data) => setGames(data || []))
      .catch((err) => console.error('Failed to fetch games catalog:', err))
      .finally(() => setLoading(false));
  }, []);

  const genres = ['ALL', ...Array.from(new Set((games || []).map((g) => g?.genre).filter(Boolean)))];

  const filteredGames = (games || []).filter((game) => {
    if (!game) return false;
    const title = (game.title || '').toLowerCase();
    const genre = (game.genre || '').toLowerCase();
    const q = (search || '').toLowerCase();
    const matchesSearch = title.includes(q) || genre.includes(q);
    const matchesPlatform =
      platformFilter === 'ALL' ||
      (platformFilter === 'PC' && (game.platform || '').toLowerCase().includes('pc')) ||
      (platformFilter === 'Mobile' && (game.platform || '').toLowerCase().includes('mobile')) ||
      (platformFilter === 'Cross-Platform' && (game.platform || '').toLowerCase().includes('cross'));
    const matchesGenre =
      genreFilter === 'ALL' || (game.genre || '').toLowerCase() === genreFilter.toLowerCase();
    return matchesSearch && matchesPlatform && matchesGenre;
  });

  const startIndex = 0;
  const endIndex = filteredGames.length;
  const currentItems = (filteredGames || []).slice(startIndex, endIndex);

  const getPlatformIcon = (platform?: string) => {
    const p = (platform || '').toLowerCase();
    if (p.includes('mobile')) return <Smartphone className="w-4 h-4 text-emerald-400" />;
    if (p.includes('cross')) return <Globe className="w-4 h-4 text-cyan-400" />;
    return <Monitor className="w-4 h-4 text-blue-400" />;
  };

  return (
    <div className="space-y-10 py-10 px-4 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="relative rounded-3xl p-8 sm:p-12 overflow-hidden border border-cyan-500/20 bg-gradient-to-br from-slate-900 via-gaming-card to-slate-950 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono tracking-wider uppercase">
            <Gamepad2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Official Titles Catalog</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-heading font-extrabold text-white tracking-wide">
            EXPLORE <span className="text-cyan-400">ESPORTS GAMES</span>
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Browse official competitive game titles supported by the platform. Jump straight into active tournament brackets, solo qualifiers, and duo/squad championships.
          </p>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-gaming-card p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search game or genre..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400 transition-colors"
          />
        </div>

        {/* Genre & Platform Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Genre Select */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono text-slate-400">Genre:</span>
            <select
              value={genreFilter}
              onChange={(e) => setGenreFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-400"
            >
              {genres.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Platform Filter Buttons */}
          <div className="flex items-center space-x-1.5 overflow-x-auto">
            {['ALL', 'PC', 'Mobile', 'Cross-Platform'].map((platform) => (
              <button
                key={platform}
                onClick={() => setPlatformFilter(platform)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium font-mono uppercase tracking-wider transition-colors whitespace-nowrap ${
                  platformFilter === platform
                    ? 'bg-cyan-400 text-black font-bold shadow-glow-cyan'
                    : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                {platform}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Games Grid */}
      {loading ? (
        <div className="text-center py-20 text-slate-400">
          <Gamepad2 className="w-10 h-10 mx-auto text-cyan-400 animate-pulse mb-3" />
          <p className="font-mono text-sm">Loading official games catalog...</p>
        </div>
      ) : filteredGames.length === 0 ? (
        <div className="text-center py-16 text-slate-400 border border-slate-800 rounded-2xl">
          <p className="text-base font-semibold text-white">No matching games found.</p>
          <p className="text-xs text-slate-500 mt-1">Try clearing your search query or platform filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentItems.map((game) => (
            <div
              key={game.id}
              className="gaming-card rounded-2xl overflow-hidden border border-slate-800 hover:border-cyan-500/50 transition-all duration-300 group flex flex-col justify-between"
            >
              {/* Cover Image or Fallback */}
              <div className="relative h-48 w-full bg-slate-900 overflow-hidden">
                {game.coverImage ? (
                  <img
                    src={game.coverImage}
                    alt={game.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950">
                    <Gamepad2 className="w-16 h-16 text-slate-700" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-gaming-card via-transparent to-black/30" />

                {/* Platform Badge */}
                <div className="absolute top-3 left-3 flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-xs text-slate-200">
                  {getPlatformIcon(game.platform)}
                  <span className="font-mono text-[11px] font-semibold">{game.platform}</span>
                </div>

                {/* Team / Solo Badge */}
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-cyan-500/20 backdrop-blur-md border border-cyan-500/40 text-[10px] font-mono text-cyan-300 uppercase tracking-wider font-bold">
                  {game.isTeamBased ? `Team (${game.minTeamSize}-${game.maxTeamSize})` : 'Solo'}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider">
                    {game.genre}
                  </span>
                  <h3 className="text-xl font-heading font-bold text-white group-hover:text-cyan-400 transition-colors mt-0.5">
                    {game.title}
                  </h3>
                </div>

                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-mono">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span>{game._count?.tournaments || 0} Active Events</span>
                  </div>

                  <button
                    onClick={() => navigate(`/tournaments`)}
                    className="inline-flex items-center space-x-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 font-mono tracking-wider transition-colors"
                  >
                    <span>Tournaments</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

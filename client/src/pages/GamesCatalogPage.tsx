import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Gamepad2, Trophy, Users, Monitor, Smartphone, Globe, Search, ArrowRight, Sparkles } from 'lucide-react';
import { gameService } from '../services/game.service';
import { Game } from '../types';
import { GameCard } from '../components/common/GameCard';
const heroBanner = '/images/hero-banner.jpg';

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
      <div className="relative w-full overflow-hidden rounded-3xl p-8 md:p-12 border border-cyan-500/30 bg-slate-950 shadow-[0_0_50px_-15px_rgba(6,182,212,0.3)]">
        {/* Shared Arena Backdrop Layer */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-60 md:opacity-70 scale-105 pointer-events-none transition-all duration-700"
          style={{ backgroundImage: `url(${heroBanner})` }}
        />

        {/* Directional Gradient Scrim: Crisp Readability Guard */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/75 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />

        {/* Electric Cyan Accent Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono tracking-wider uppercase">
            <Gamepad2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Official Titles Catalog</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-heading font-extrabold text-white tracking-wide">
            EXPLORE{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400">
              ESPORTS GAMES
            </span>
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
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}
    </div>
  );
};

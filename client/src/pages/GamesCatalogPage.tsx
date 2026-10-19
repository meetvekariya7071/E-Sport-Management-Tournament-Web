import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gamepad2, Search, Filter, Trophy, Users, Monitor, Smartphone, Globe, Sparkles } from 'lucide-react';
import { gameService } from '../api/game.service';
import { Game } from '../types';

export const GamesCatalogPage: React.FC = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('ALL');
  const [selectedPlatform, setSelectedPlatform] = useState('ALL');

  useEffect(() => {
    gameService
      .getAllGames()
      .then((data) => setGames(data))
      .catch((err) => console.error('Failed to load games:', err))
      .finally(() => setLoading(false));
  }, []);

  // Compute unique genres and platforms
  const genres = ['ALL', ...Array.from(new Set(games.map((g) => g.genre).filter(Boolean)))];
  const platforms = ['ALL', ...Array.from(new Set(games.map((g) => g.platform).filter((p): p is string => Boolean(p))))];

  // Filter games based on search, genre, and platform
  const filteredGames = games.filter((game) => {
    const matchesSearch =
      game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.genre.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = selectedGenre === 'ALL' || game.genre.toLowerCase() === selectedGenre.toLowerCase();
    const gamePlatform = game.platform || 'PC';
    const matchesPlatform = selectedPlatform === 'ALL' || gamePlatform.toLowerCase() === selectedPlatform.toLowerCase();
    return matchesSearch && matchesGenre && matchesPlatform;
  });

  const getPlatformIcon = (platform?: string) => {
    switch ((platform || 'PC').toLowerCase()) {
      case 'mobile':
        return <Smartphone className="w-3.5 h-3.5 text-amber-400" />;
      case 'cross-platform':
        return <Globe className="w-3.5 h-3.5 text-cyan-400" />;
      default:
        return <Monitor className="w-3.5 h-3.5 text-blue-400" />;
    }
  };

  return (
    <div className="space-y-8 py-10 px-4 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="relative rounded-3xl p-8 sm:p-12 overflow-hidden border border-slate-800 bg-gradient-to-br from-slate-900 via-gaming-card to-slate-950 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Master Games Catalog</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-heading font-extrabold text-white tracking-wide">
            EXPLORE <span className="text-cyan-400">ESPORTS TITLES</span>
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Discover verified competitive titles supported on our platform. Filter by genre, platform,
            and supported formats, and jump straight into live tournament brackets.
          </p>
        </div>
      </div>

      {/* Filter and Search Controls Bar */}
      <div className="gaming-card p-4 sm:p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search game title, genre..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all placeholder:text-slate-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Genre Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="ALL">All Genres</option>
              {genres
                .filter((g) => g !== 'ALL')
                .map((genre) => (
                  <option key={genre} value={genre}>
                    {genre}
                  </option>
                ))}
            </select>
          </div>

          {/* Platform Filter */}
          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            <option value="ALL">All Platforms</option>
            {platforms
              .filter((p) => p !== 'ALL')
              .map((plat) => (
                <option key={plat} value={plat}>
                  {plat}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Games Catalog Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="gaming-card h-80 rounded-2xl animate-pulse bg-slate-800/40 border border-slate-800" />
          ))}
        </div>
      ) : filteredGames.length === 0 ? (
        <div className="text-center py-20 gaming-card rounded-3xl border border-slate-800 p-8 space-y-4">
          <Gamepad2 className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-heading font-bold text-white">No Games Match Your Filters</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try adjusting your search query or reset the genre filter to view all available titles.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedGenre('ALL');
              setSelectedPlatform('ALL');
            }}
            className="px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase hover:bg-cyan-500/20 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGames.map((game) => (
            <div
              key={game.id}
              className="gaming-card rounded-2xl overflow-hidden group border border-slate-800 hover:border-cyan-500/50 transition-all duration-300 flex flex-col justify-between"
            >
              {/* Banner / Cover */}
              <div className="relative h-48 w-full overflow-hidden bg-slate-900">
                {game.coverImage ? (
                  <img
                    src={game.coverImage}
                    alt={game.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-cyan-400">
                    <Gamepad2 className="w-12 h-12" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                {/* Badges on Banner */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950/80 backdrop-blur-md border border-slate-700/80 text-[10px] font-mono uppercase text-slate-200">
                    {getPlatformIcon(game.platform)}
                    <span>{game.platform}</span>
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2.5 py-1 rounded-md border backdrop-blur-md ${
                      game.isTeamBased
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}
                  >
                    {game.isTeamBased ? 'TEAM FORMAT' : 'SOLO ONLY'}
                  </span>
                </div>

                <div className="absolute bottom-3 left-3 right-3">
                  <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block mb-0.5">
                    {game.genre}
                  </span>
                  <h3 className="text-xl font-heading font-bold text-white group-hover:text-cyan-400 transition-colors">
                    {game.title}
                  </h3>
                </div>
              </div>

              {/* Game Metadata and Details */}
              <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                    <span className="text-slate-400 text-[10px] block font-mono">Team Size</span>
                    <span className="text-white font-semibold">
                      {game.minTeamSize === game.maxTeamSize
                        ? `${game.minTeamSize} Players`
                        : `${game.minTeamSize} - ${game.maxTeamSize} Players`}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                    <span className="text-slate-400 text-[10px] block font-mono">Tournaments</span>
                    <span className="text-cyan-400 font-semibold font-mono">
                      {game._count?.tournaments || 0} Hosted
                    </span>
                  </div>
                </div>

                {/* Action CTA */}
                <Link
                  to={`/tournaments?gameId=${game.id}`}
                  className="w-full py-2.5 rounded-xl bg-slate-800/90 hover:bg-cyan-500/20 hover:text-cyan-300 hover:border-cyan-500/40 border border-slate-700/80 text-slate-200 text-xs font-heading font-bold tracking-wider flex items-center justify-center space-x-2 transition-all"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Browse Tournaments</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

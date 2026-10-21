import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Gamepad2, Trophy, ArrowRight, Monitor, Smartphone, Globe } from 'lucide-react';
import { Game } from '../../types';

interface GameCardProps {
  game: Game;
}

export const GameCard: React.FC<GameCardProps> = ({ game }) => {
  const navigate = useNavigate();

  const getPlatformIcon = (platform?: string) => {
    const p = (platform || '').toLowerCase();
    if (p.includes('mobile')) return <Smartphone className="w-4 h-4 text-emerald-400" />;
    if (p.includes('cross')) return <Globe className="w-4 h-4 text-cyan-400" />;
    return <Monitor className="w-4 h-4 text-blue-400" />;
  };

  const coverSrc =
    game.coverImage ||
    (game as any).coverImageUrl ||
    (game as any).bannerUrl ||
    '/images/hero-banner.jpg';

  const targetPath = `/games/${game.slug || game.id}`;

  const handleCardClick = () => {
    navigate(targetPath);
  };

  return (
    <div
      onClick={handleCardClick}
      className="gaming-card rounded-2xl overflow-hidden border border-slate-800 hover:border-cyan-500/50 transition-all duration-300 group flex flex-col justify-between shadow-xl cursor-pointer hover:-translate-y-1"
    >
      {/* Game Image Banner */}
      <div className="relative h-48 w-full bg-slate-900 overflow-hidden">
        {coverSrc ? (
          <img
            src={coverSrc}
            alt={game.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/images/hero-banner.jpg';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950">
            <Gamepad2 className="w-16 h-16 text-slate-700" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-gaming-card via-transparent to-black/30 pointer-events-none" />

        {/* Platform Badge */}
        <div className="absolute top-3 left-3 flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-xs text-slate-200">
          {getPlatformIcon(game.platform)}
          <span className="font-mono text-[11px] font-semibold">{game.platform || 'PC'}</span>
        </div>

        {/* Format Badge */}
        <div className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-cyan-500/20 backdrop-blur-md border border-cyan-500/40 text-[10px] font-mono text-cyan-300 uppercase tracking-wider font-bold">
          {game.isTeamBased ? `Team (${game.minTeamSize}-${game.maxTeamSize})` : 'Solo'}
        </div>

        {game.isActive === false && (
          <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/80 text-black">
            ARCHIVED
          </div>
        )}
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
          <div className="flex items-center space-x-1.5 font-mono text-slate-300">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>{game._count?.tournaments ?? game.tournaments?.length ?? 0} Events</span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(targetPath);
            }}
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 font-mono tracking-wider transition-colors"
          >
            <span>View Details</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameCard;

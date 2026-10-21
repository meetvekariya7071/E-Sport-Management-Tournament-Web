import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Trophy,
  Gamepad2,
  Calendar,
  Clock,
  Radio,
  CheckCircle2,
  Eye,
  ArrowRight
} from 'lucide-react';
import { Tournament, TournamentLifecycle } from '../../types';
import { getTournamentLifecycleStatus } from '../../utils/tournamentLifecycle';

interface TournamentCardProps {
  tournament: Tournament;
  category?: 'LIVE' | 'REGISTRATION_OPEN' | 'FUTURE' | 'PAST';
  onRegister?: (tournament: Tournament) => void;
}

export const TournamentCard: React.FC<TournamentCardProps> = ({
  tournament,
  category: propCategory,
  onRegister
}) => {
  const navigate = useNavigate();

  // Compute category if not provided
  const category: 'LIVE' | 'REGISTRATION_OPEN' | 'FUTURE' | 'PAST' =
    propCategory ||
    (tournament.lifecycleStatus as any) ||
    getTournamentLifecycleStatus(tournament);

  const unitLabel = tournament.format === 'SOLO' ? 'Players' : 'Teams';
  const capacityPercent = Math.min(
    100,
    Math.round(((tournament.currentCount || 0) / (tournament.maxParticipants || 1)) * 100)
  );
  const isFull = (tournament.currentCount || 0) >= (tournament.maxParticipants || 1);

  const getFormatBadge = (format: string) => {
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
    return `Registration opens in ${diffDays}d`;
  };

  const bannerSource =
    tournament.bannerImage ||
    (tournament as any).bannerUrl ||
    (tournament as any).coverImageUrl ||
    (tournament.game as any)?.coverImage ||
    '/images/hero-banner.jpg';

  const handleCardClick = () => {
    navigate(`/tournaments/${tournament.id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className={`gaming-card rounded-2xl border flex flex-col justify-between overflow-hidden transition-all duration-300 group cursor-pointer hover:-translate-y-1 hover:border-cyan-500/50 shadow-xl ${
        category === 'LIVE'
          ? 'border-red-500/30 hover:border-red-500/60 shadow-red-950/20'
          : category === 'REGISTRATION_OPEN'
          ? 'border-emerald-500/30 hover:border-emerald-400/60 shadow-emerald-950/20'
          : category === 'FUTURE'
          ? 'border-amber-500/30 hover:border-amber-400/60 shadow-amber-950/20'
          : 'border-slate-800 hover:border-slate-700 shadow-black/40'
      }`}
    >
      {/* Banner Image Container */}
      <div className="relative h-40 w-full bg-slate-900 overflow-hidden">
        {bannerSource ? (
          <img
            src={bannerSource}
            alt={tournament.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/images/hero-banner.jpg';
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex items-center justify-center">
            <Trophy className="w-10 h-10 text-slate-700/60" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent pointer-events-none" />

        {/* Badges Overlay */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <span
            className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider backdrop-blur-md ${getFormatBadge(
              tournament.format
            )}`}
          >
            {tournament.format}
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
              {tournament.game?.title || 'Competitive Title'}
            </span>
            <span>•</span>
            <span className="text-[11px] font-mono text-slate-400">
              {tournament.game?.platform || 'PC'}
            </span>
          </div>

          <h3 className="font-heading font-extrabold text-lg text-white group-hover:text-cyan-400 transition-colors line-clamp-1">
            {tournament.title}
          </h3>

          {tournament.description && (
            <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
              {tournament.description}
            </p>
          )}
        </div>

        {/* Meta & Metrics */}
        <div className="space-y-3 pt-3 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              {tournament.startDate ? new Date(tournament.startDate).toLocaleDateString() : 'TBD'}
            </span>
            {tournament.prizePool && (
              <span className="flex items-center gap-1 text-emerald-400 font-bold font-mono text-xs">
                <Trophy className="w-3.5 h-3.5" />
                {tournament.prizePool}
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
                  {tournament.currentCount || 0}/{tournament.maxParticipants} {unitLabel} Filled
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
                {getCountdownString(tournament.registrationStartDate)}
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Cap: {tournament.maxParticipants} {unitLabel}
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
                {tournament.currentCount || 0} {unitLabel} Competing
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
                {tournament.currentCount || 0} {unitLabel} Showdown
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Card Actions Footer with stopPropagation */}
      <div className="p-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-3 bg-slate-950/60">
        {category === 'LIVE' && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/tournaments/${tournament.id}/live`);
              }}
              className="flex-1 py-2 px-3 text-xs font-heading font-bold rounded-xl bg-red-600 hover:bg-red-500 text-white flex items-center justify-center gap-1.5 shadow-lg shadow-red-900/30 transition-all"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Watch Live / Standings</span>
            </button>
            <span className="text-[11px] font-mono text-slate-500 px-2 py-1 rounded bg-slate-900/80 border border-slate-800 shrink-0">
              Registration Closed
            </span>
          </>
        )}

        {category === 'REGISTRATION_OPEN' && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/tournaments/${tournament.id}`);
              }}
              className="px-3 py-2 text-xs font-semibold rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1"
            >
              <span>Details</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            {!isFull ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onRegister) {
                    onRegister(tournament);
                  } else {
                    navigate(`/tournaments/${tournament.id}`);
                  }
                }}
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
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/tournaments/${tournament.id}`);
            }}
            className="flex-1 py-2 px-3 text-xs font-heading font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 hover:border-cyan-500/40 flex items-center justify-center gap-1.5 transition-all"
          >
            <span>View Rules & Schedule</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}

        {category === 'PAST' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/tournaments/${tournament.id}`);
            }}
            className="flex-1 py-2 px-3 text-xs font-heading font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 flex items-center justify-center gap-1.5 transition-all"
          >
            <Trophy className="w-3.5 h-3.5 text-yellow-400" />
            <span>View Results</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default TournamentCard;

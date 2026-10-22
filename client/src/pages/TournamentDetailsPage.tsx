import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { tournamentService } from '../services/tournament.service';
import { TournamentDetails } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Trophy,
  Gamepad2,
  Calendar,
  Users,
  ShieldAlert,
  ArrowLeft,
  Clock,
  Flame,
  Award,
  BookOpen,
  Share2,
  CheckCircle2,
  UserCheck,
  Radio
} from 'lucide-react';
import { RegistrationModal } from '../components/RegistrationModal';

export const TournamentDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, role, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [tournament, setTournament] = useState<TournamentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRegModal, setShowRegModal] = useState(false);

  // Live countdown state
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  const loadDetails = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await tournamentService.getTournamentDetails(id);
      setTournament(data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load tournament');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [id]);

  // Live countdown ticker
  useEffect(() => {
    if (!tournament?.startDate) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const target = new Date(tournament.startDate).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeRemaining('Tournament Started');
        clearInterval(interval);
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeRemaining(`${days}d ${hours}h ${minutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [tournament?.startDate]);

  const handleDisqualify = async (participantId: string, username: string) => {
    const reason = prompt(`Enter reason to disqualify ${username}:`);
    if (!reason || !id) return;

    try {
      await tournamentService.disqualifyParticipant(id, participantId, reason);
      alert(`${username} has been disqualified.`);
      loadDetails();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Disqualification failed');
    }
  };

  const isOrganizerOwner = user?.id === tournament?.organizer?.id;
  const canModerate = role === 'ADMIN' || isOrganizerOwner;

  // Check if current logged-in user is already registered
  const isAlreadyRegistered = tournament?.participants.some(
    (p) => p.user.id === user?.id
  );

  if (loading) {
    return (
      <div className="text-center py-24 text-slate-500 space-y-3">
        <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="font-mono text-xs">Loading tournament scope & database...</p>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="text-center py-20 space-y-4 max-w-md mx-auto">
        <div className="text-red-400 text-lg font-bold">{error || 'Tournament Not Found'}</div>
        <Link
          to="/tournaments"
          className="px-4 py-2 rounded-xl bg-slate-800 text-cyan-400 hover:underline text-xs font-mono inline-block"
        >
          &larr; Return to Tournament Catalog
        </Link>
      </div>
    );
  }

  const isSolo = tournament.format === 'SOLO';
  const unitLabel = isSolo ? 'Players' : 'Teams';
  const isFull = tournament.currentCount >= tournament.maxParticipants;
  const isOpen = tournament.status === 'REGISTRATION_OPEN';

  let parsedRules: any = {};
  try {
    parsedRules = typeof tournament.rules === 'string' ? JSON.parse(tournament.rules) : tournament.rules || {};
  } catch {
    parsedRules = {};
  }

  const heroBackground =
    tournament.bannerImage ||
    (tournament as any).bannerUrl ||
    (tournament as any).coverImageUrl ||
    (tournament.game as any)?.coverImage ||
    '/images/hero-banner.jpg';

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto py-8 px-4">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/tournaments"
          className="text-xs font-mono text-cyan-400 hover:underline inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to tournament catalog
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/tournaments/${tournament.id}/live`}
            className="px-3.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,240,255,0.15)]"
          >
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>Watch Live / Brackets &rarr;</span>
          </Link>

          {canModerate && (
            <Link
              to={`/organizer/tournaments/${tournament.id}/scoring`}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1.5"
            >
              <span>Live Scoring Console &rarr;</span>
            </Link>
          )}

          {canModerate && (
            <Link
              to={`/organizer/tournaments/${tournament.id}/database`}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-400 text-xs font-mono font-bold"
            >
              Database &rarr;
            </Link>
          )}
        </div>
      </div>

      {/* Hero Tournament Banner with Dynamic Image Backdrop */}
      <div className="relative w-full overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 p-6 sm:p-10 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
        {/* Dynamic Background Image Layer with Esports Gradient Overlay */}
        <img
          src={heroBackground}
          alt={tournament.title}
          className="absolute inset-0 w-full h-full object-cover opacity-35 mix-blend-luminosity scale-105 pointer-events-none transition-all duration-700"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/images/hero-banner.jpg';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/65 to-transparent pointer-events-none" />

        <div className="relative z-10 space-y-4 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-0.5 rounded-full text-xs font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 uppercase">
              {tournament.format} FORMAT
            </span>
            <span className="px-3 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase">
              {tournament.status.replace('_', ' ')}
            </span>
            <span className="px-3 py-0.5 rounded-full text-xs font-mono bg-purple-500/10 text-purple-400 border border-purple-500/30">
              {tournament.structure?.replace('_', ' ') || 'SINGLE ELIMINATION'}
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-heading font-extrabold text-white leading-tight">
            {tournament.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
            <span className="flex items-center gap-1.5 font-semibold">
              <Gamepad2 className="w-4 h-4 text-cyan-400" />
              {tournament.game?.title}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              {new Date(tournament.startDate).toLocaleString()}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <Users className="w-4 h-4 text-blue-400" />
              Organizer: <span className="text-white font-semibold">{tournament.organizer?.username}</span>
            </span>
          </div>

          {tournament.description && (
            <p className="text-sm text-slate-300 leading-relaxed pt-1">
              {tournament.description}
            </p>
          )}
        </div>

        {/* Live Status & Dynamic Register Box */}
        <div className="relative z-10 p-6 rounded-2xl bg-slate-900/90 border border-cyan-500/30 text-center shrink-0 w-full sm:w-72 space-y-4 shadow-glow-cyan backdrop-blur-md">
          {/* Capacity Indicator */}
          <div>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">
              Slot Capacity
            </span>
            <div className="text-3xl font-heading font-extrabold text-cyan-400 font-mono mt-0.5">
              {tournament.currentCount} / {tournament.maxParticipants}
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {tournament.currentCount} {unitLabel} Registered
            </span>
            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full"
                style={{
                  width: `${Math.min(
                    100,
                    (tournament.currentCount / tournament.maxParticipants) * 100
                  )}%`
                }}
              ></div>
            </div>
          </div>

          {/* Prize Pool */}
          {tournament.prizePool && (
            <div className="pt-2 border-t border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                Prize Pool
              </span>
              <span className="text-lg font-mono font-bold text-emerald-400 flex items-center justify-center gap-1.5">
                <Trophy className="w-4 h-4" />
                {tournament.prizePool}
              </span>
            </div>
          )}

          {/* Live Countdown */}
          {timeRemaining && (
            <div className="pt-2 border-t border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                Countdown to Start
              </span>
              <span className="text-xs font-mono font-bold text-amber-400 flex items-center justify-center gap-1 mt-0.5">
                <Clock className="w-3.5 h-3.5" />
                {timeRemaining}
              </span>
            </div>
          )}

          {/* Dynamic Register Action */}
          <div className="pt-2">
            {isAlreadyRegistered ? (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-heading font-bold flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>You are Registered</span>
              </div>
            ) : isOpen && !isFull ? (
              <button
                onClick={() => setShowRegModal(true)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-black font-heading font-extrabold text-sm uppercase tracking-wider shadow-glow-cyan transition-all transform hover:-translate-y-0.5"
              >
                Register Now
              </button>
            ) : isFull ? (
              <div className="py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono font-bold">
                Capacity Full
              </div>
            ) : (
              <div className="py-2.5 rounded-xl bg-slate-800 text-slate-500 text-xs font-mono">
                Registration Closed
              </div>
            )}

            <Link
              to={`/tournaments/${tournament.id}/live`}
              className="mt-3 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-400 hover:text-cyan-300 font-mono font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(0,240,255,0.1)]"
            >
              <Radio className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
              <span>View Brackets & Live Arena &rarr;</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Tournament Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Participants & Roster List */}
        <div className="lg:col-span-2 space-y-6">
          {/* Participants Table */}
          <div className="gaming-card rounded-2xl border border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-heading font-bold text-lg text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" />
                Enrolled Participants ({tournament.participants.length})
              </h3>
              {isSolo && (
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                  Solo Bracket (Direct DB Link)
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="text-[10px] font-mono uppercase text-slate-500 border-b border-slate-800">
                  <tr>
                    <th className="py-2 px-3">Competitor</th>
                    {!isSolo && <th className="py-2 px-3">Team</th>}
                    <th className="py-2 px-3">Status</th>
                    {canModerate && <th className="py-2 px-3 text-right">Moderation</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {tournament.participants.length === 0 ? (
                    <tr>
                      <td colSpan={canModerate ? 4 : 3} className="py-8 text-center text-slate-500">
                        No competitors registered yet. Be the first to claim a slot!
                      </td>
                    </tr>
                  ) : (
                    tournament.participants.map((p) => (
                      <tr key={p.participantId} className="hover:bg-slate-800/30">
                        <td className="py-3 px-3 font-semibold text-white flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center text-[10px] text-cyan-400 font-mono font-bold">
                            {p.user.username.slice(0, 2).toUpperCase()}
                          </div>
                          <span>{p.user.username}</span>
                        </td>
                        {!isSolo && (
                          <td className="py-3 px-3 text-cyan-400 font-mono">
                            {p.team?.name || 'Unassigned'} {p.team?.tag && `[${p.team.tag}]`}
                          </td>
                        )}
                        <td className="py-3 px-3">
                          {p.disqualified ? (
                            <span className="text-red-400 text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/30">
                              Disqualified
                            </span>
                          ) : (
                            <span className="text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
                              {p.status}
                            </span>
                          )}
                        </td>
                        {canModerate && (
                          <td className="py-3 px-3 text-right">
                            {!p.disqualified && (
                              <button
                                onClick={() => handleDisqualify(p.participantId, p.user.username)}
                                className="px-2 py-0.5 text-[10px] font-semibold text-red-400 hover:bg-red-500/20 rounded border border-red-500/30"
                              >
                                Disqualify
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Teams Roster View for DUO / SQUAD */}
          {!isSolo && (
            <div className="gaming-card rounded-2xl border border-slate-800 p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-heading font-bold text-lg text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-blue-400" />
                  Registered Teams & Rosters ({tournament.teams.length})
                </h3>
              </div>

              <div className="space-y-3">
                {tournament.teams.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs font-mono">
                    No teams registered yet. Click &ldquo;Register Now&rdquo; to create the first team!
                  </div>
                ) : (
                  tournament.teams.map((t) => (
                    <div
                      key={t.id}
                      className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-heading font-bold text-white text-base">
                          {t.name} {t.tag && <span className="text-cyan-400 font-mono">[{t.tag}]</span>}
                        </span>
                        <span className="text-xs font-mono text-slate-400">
                          Captain: <span className="text-white font-semibold">{t.captain.username}</span>
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {t.members.map((m, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-300 font-mono flex items-center gap-1 border border-slate-700"
                          >
                            <UserCheck className="w-3 h-3 text-cyan-400" />
                            {m.user.username}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Official Rules & Metadata */}
        <div className="space-y-6">
          <div className="gaming-card rounded-2xl border border-slate-800 p-6 space-y-4">
            <h3 className="font-heading font-bold text-base text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              Tournament Rules & Format
            </h3>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-slate-400 font-mono block text-[10px] uppercase">Bracket Structure</span>
                <span className="font-semibold text-white">{tournament.structure?.replace('_', ' ')}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-slate-400 font-mono block text-[10px] uppercase">Roster Restrictions</span>
                <span className="font-semibold text-white">
                  {isSolo ? 'Solo 1v1 (No substitutes)' : tournament.format === 'DUO' ? 'Duo (Exactly 2 players)' : 'Squad (Exactly 4 players)'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-slate-400 font-mono block text-[10px] uppercase">Platform & Anti-Cheat</span>
                <span className="font-semibold text-white">
                  {tournament.game?.platform || 'PC'} • Standard Server Anti-Cheat & Fair-Play Match Dispute Engine
                </span>
              </div>

              {parsedRules.matchFormat && (
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-slate-400 font-mono block text-[10px] uppercase">Match Format</span>
                  <span className="font-semibold text-white">{parsedRules.matchFormat}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Registration Modal */}
      {showRegModal && (
        <RegistrationModal
          isOpen={showRegModal}
          onClose={() => setShowRegModal(false)}
          tournament={tournament}
          onSuccess={() => {
            loadDetails();
          }}
        />
      )}
    </div>
  );
};

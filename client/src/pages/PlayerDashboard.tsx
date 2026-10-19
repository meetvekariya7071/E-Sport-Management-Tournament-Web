import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { tournamentService } from '../api/tournament.service';
import { PlayerRegistration, Tournament } from '../types';
import { RegistrationModal } from '../components/RegistrationModal';
import {
  Trophy,
  Shield,
  Zap,
  Gamepad2,
  Calendar,
  CheckCircle,
  XCircle,
  ArrowRight,
  Sparkles,
  Users,
  Copy,
  Check,
  LogOut,
  AlertTriangle,
  Clock,
  Swords
} from 'lucide-react';

export const PlayerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState<PlayerRegistration[]>([]);
  const [openTournaments, setOpenTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Tab: 'MY_TOURNAMENTS' | 'BROWSE' | 'HISTORY'
  const [activeTab, setActiveTab] = useState<'MY_TOURNAMENTS' | 'BROWSE' | 'HISTORY'>('MY_TOURNAMENTS');

  const loadData = async () => {
    try {
      setLoading(true);
      const [regs, openList] = await Promise.all([
        tournamentService.getPlayerRegistrations().catch(() => []),
        tournamentService.getPublicTournaments({ status: 'REGISTRATION_OPEN' }).catch(() => [])
      ]);
      setRegistrations(regs || []);
      setOpenTournaments(openList || []);
    } catch (err) {
      console.error('Failed to load player match hub data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopyInviteCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2500);
  };

  const handleWithdraw = async (tournamentId: string, tournamentTitle: string, isCaptain: boolean) => {
    const confirmMessage = isCaptain
      ? `Are you sure you want to DISBAND your team and withdraw from "${tournamentTitle}"? All roster members will be withdrawn.`
      : `Are you sure you want to LEAVE your team and withdraw from "${tournamentTitle}"?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      await tournamentService.withdrawRegistration(tournamentId);
      alert('Withdrawal completed.');
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Withdrawal failed.');
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto">
      {/* Player Profile Header Card */}
      <div className="gaming-card rounded-3xl p-6 sm:p-8 border border-cyan-500/30 bg-gradient-to-r from-slate-900 via-gaming-card to-slate-950 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center space-x-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-heading font-extrabold text-3xl text-black shadow-glow-cyan border-2 border-white/20">
              {user?.username.slice(0, 2).toUpperCase()}
            </div>
            <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded bg-emerald-500 text-black text-[9px] font-mono font-bold">
              PRO
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Player Competitive Match Hub
            </span>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-white">
              WELCOME, <span className="text-cyan-400">{user?.username}</span>
            </h1>
            <p className="text-xs text-slate-400">
              {user?.bio || 'Active Competitor • Solo, Duo & Squad Roster Deployment Ready'}
            </p>
          </div>
        </div>

        {/* Player Stats Widget */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 w-full md:w-80 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-heading font-bold text-white uppercase tracking-wider">Tournament Passport</span>
            <span className="text-cyan-400 font-mono text-[11px]">ACTIVE PLAYER</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center pt-1">
            <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700">
              <span className="text-[10px] text-slate-400 block font-mono">Enrolled</span>
              <span className="text-xs font-bold text-cyan-400 font-mono">{registrations.length}</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700">
              <span className="text-[10px] text-slate-400 block font-mono">Teams</span>
              <span className="text-xs font-bold text-purple-400 font-mono">
                {registrations.filter((r) => r.team).length}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700">
              <span className="text-[10px] text-slate-400 block font-mono">Open Cups</span>
              <span className="text-xs font-bold text-emerald-400 font-mono">{openTournaments.length}</span>
            </div>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full w-[75%] rounded-full shadow-glow-cyan"></div>
          </div>
        </div>
      </div>

      {/* Hub Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('MY_TOURNAMENTS')}
          className={`px-4 py-2 rounded-xl text-xs font-heading font-bold flex items-center space-x-2 transition-all ${
            activeTab === 'MY_TOURNAMENTS'
              ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-black shadow-glow-cyan'
              : 'text-slate-400 hover:text-white bg-slate-800/40'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>My Tournaments & Rosters ({registrations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('BROWSE')}
          className={`px-4 py-2 rounded-xl text-xs font-heading font-bold flex items-center space-x-2 transition-all ${
            activeTab === 'BROWSE'
              ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-black shadow-glow-cyan'
              : 'text-slate-400 hover:text-white bg-slate-800/40'
          }`}
        >
          <Gamepad2 className="w-4 h-4" />
          <span>Browse Open Cups ({openTournaments.length})</span>
        </button>

        <Link
          to="/tournaments"
          className="ml-auto text-xs font-mono text-cyan-400 hover:underline flex items-center gap-1"
        >
          Full Catalog <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* TAB 1: MY TOURNAMENTS & ROSTERS */}
      {activeTab === 'MY_TOURNAMENTS' && (
        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-20 text-slate-500 space-y-2">
              <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="font-mono text-xs">Loading your tournament hub...</p>
            </div>
          ) : registrations.length === 0 ? (
            <div className="gaming-card rounded-2xl border border-slate-800 p-12 text-center space-y-4">
              <Trophy className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="font-heading font-bold text-lg text-white">No Active Registrations</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                You have not registered for any tournament brackets yet. Browse open cups to enter Solo or assemble a squad.
              </p>
              <button
                onClick={() => setActiveTab('BROWSE')}
                className="px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-heading font-bold text-xs uppercase tracking-wider shadow-glow-cyan"
              >
                Browse Open Tournaments
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {registrations.map((reg) => {
                const t = reg.tournament;
                const isSolo = t.format === 'SOLO';
                const canWithdraw = t.status === 'REGISTRATION_OPEN';

                return (
                  <div
                    key={reg.registrationId}
                    className="gaming-card rounded-2xl border border-slate-800 hover:border-cyan-500/40 p-6 space-y-6 transition-all"
                  >
                    {/* Top Row: Tournament Title & Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 uppercase font-bold">
                            {t.format}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase">
                            {t.status.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            IGN: <strong className="text-white">{reg.inGameName || user?.username}</strong>
                          </span>
                        </div>

                        <h3 className="text-xl font-heading font-extrabold text-white">
                          {t.title}
                        </h3>

                        <div className="flex items-center space-x-3 text-xs text-slate-400">
                          <span className="flex items-center gap-1 text-slate-300 font-semibold">
                            <Gamepad2 className="w-3.5 h-3.5 text-cyan-400" />
                            {t.game?.title}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-mono">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            {new Date(t.startDate).toLocaleDateString()}
                          </span>
                          {t.prizePool && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-400 font-mono font-bold flex items-center gap-1">
                                <Trophy className="w-3 h-3" /> {t.prizePool}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 shrink-0">
                        <Link
                          to={`/tournaments/${t.id}`}
                          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-heading font-semibold text-white border border-slate-700"
                        >
                          View Details &rarr;
                        </Link>

                        {canWithdraw && (
                          <button
                            onClick={() =>
                              handleWithdraw(t.id, t.title, reg.team?.isCaptain || false)
                            }
                            className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-heading font-bold flex items-center space-x-1.5 transition-colors"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>
                              {reg.team?.isCaptain ? 'Disband Team' : 'Leave Tournament'}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Middle: Team Roster Details or Solo Badge */}
                    {reg.team ? (
                      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700/80 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4 text-cyan-400" />
                            <span className="font-heading font-bold text-white text-sm">
                              {reg.team.name}
                            </span>
                            {reg.team.tag && (
                              <span className="text-xs font-mono text-cyan-400">
                                [{reg.team.tag}]
                              </span>
                            )}
                            {reg.team.isCaptain && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold">
                                CAPTAIN
                              </span>
                            )}
                          </div>

                          {/* Invite Code Box for Teammates */}
                          {reg.team.inviteCode && (
                            <div className="flex items-center space-x-2 bg-slate-800/90 px-3 py-1.5 rounded-lg border border-slate-700">
                              <span className="text-[10px] font-mono text-slate-400 uppercase">
                                Invite Code:
                              </span>
                              <span className="font-mono font-bold text-cyan-400 text-xs tracking-wider">
                                {reg.team.inviteCode}
                              </span>
                              <button
                                onClick={() =>
                                  handleCopyInviteCode(reg.team!.inviteCode!, reg.registrationId)
                                }
                                className="p-1 text-slate-400 hover:text-white"
                                title="Copy 6-Character Invite Code"
                              >
                                {copiedCodeId === reg.registrationId ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Roster Members */}
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
                            Roster Members ({reg.team.members.length}/
                            {t.format === 'DUO' ? 2 : 4})
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {reg.team.members.map((m) => (
                              <div
                                key={m.userId}
                                className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-mono text-slate-200 border border-slate-700/80 flex items-center space-x-2"
                              >
                                <span>{m.username}</span>
                                {m.role === 'CAPTAIN' && (
                                  <span className="text-[9px] text-amber-400 font-bold">★ CPT</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center space-x-3 text-xs text-slate-400">
                        <Shield className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span>
                          Solo Bracket Enrollment: Directly mapped to seed slot without team dependency.
                        </span>
                      </div>
                    )}

                    {/* Match Schedule / Bracket Notice */}
                    {t.rounds && t.rounds.length > 0 && (
                      <div className="pt-2 border-t border-slate-800 space-y-2">
                        <div className="flex items-center space-x-2 text-xs font-heading font-bold text-white">
                          <Swords className="w-4 h-4 text-cyan-400" />
                          <span>Active Match Rounds</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {t.rounds.map((r: any) => (
                            <div
                              key={r.id}
                              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs"
                            >
                              <span className="font-bold text-white block">{r.name}</span>
                              <span className="text-[10px] font-mono text-slate-400">
                                {r.matches?.length || 0} Scheduled Matches
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BROWSE OPEN CUPS */}
      {activeTab === 'BROWSE' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {openTournaments.length === 0 ? (
              <div className="col-span-3 text-center py-12 text-slate-500">
                No open tournaments found right now.
              </div>
            ) : (
              openTournaments.map((t) => (
                <div
                  key={t.id}
                  className="gaming-card p-5 rounded-2xl border border-slate-800 hover:border-cyan-500/40 flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 uppercase font-bold">
                        {t.format}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {t.currentCount}/{t.maxParticipants} Slots
                      </span>
                    </div>

                    <h3 className="font-heading font-bold text-lg text-white group-hover:text-cyan-400 transition-colors">
                      {t.title}
                    </h3>

                    <div className="flex items-center space-x-2 text-xs text-slate-400 mt-2">
                      <Gamepad2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{t.game?.title || 'Game'}</span>
                    </div>

                    <div className="flex items-center space-x-2 text-xs text-slate-400 mt-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>{new Date(t.startDate).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between">
                    <Link
                      to={`/tournaments/${t.id}`}
                      className="text-xs font-mono text-slate-400 hover:text-white"
                    >
                      View Details
                    </Link>

                    <button
                      onClick={() => setSelectedTournament(t)}
                      className="px-4 py-1.5 text-xs font-heading font-bold rounded-lg bg-cyan-400 hover:bg-cyan-300 text-black shadow-glow-cyan transition-all"
                    >
                      Enter Bracket
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Registration Modal Popup */}
      {selectedTournament && (
        <RegistrationModal
          isOpen={!!selectedTournament}
          onClose={() => setSelectedTournament(null)}
          tournament={selectedTournament}
          onSuccess={() => {
            loadData();
          }}
        />
      )}
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { RefereeAPI, RefereeKPIs } from '../api/referee.service';
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  UserCheck,
  Users,
  Trophy,
  Gamepad2,
  Calendar,
  Search,
  Filter,
  Check,
  Ban,
  FileCheck,
  ExternalLink,
  Lock,
  FileText,
  Radio,
  Play
} from 'lucide-react';

export const RefereeDashboard: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'MATCHES' | 'CHECKIN'>('MATCHES');
  const [matches, setMatches] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('');
  const [roster, setRoster] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // KPIs
  const [kpis, setKpis] = useState<RefereeKPIs>({
    totalAssigned: 0,
    awaitingCheckin: 0,
    inProgress: 0,
    pendingValidation: 0,
    completed: 0,
    activeDisputes: 0
  });

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Disqualify Prompt State
  const [disqualifyModal, setDisqualifyModal] = useState<{
    open: boolean;
    participantId: string;
    participantName: string;
    reason: string;
  }>({
    open: false,
    participantId: '',
    participantName: '',
    reason: ''
  });

  const loadAssignedMatches = async () => {
    try {
      setLoading(true);
      const res = await RefereeAPI.getAssignedMatches();
      if (res.success) {
        setMatches(res.matches || []);
        if (res.kpis) {
          setKpis(res.kpis);
        }

        // Extract unique tournaments
        const uniqueTournamentsMap = new Map();
        for (const m of res.matches || []) {
          if (m.tournament && !uniqueTournamentsMap.has(m.tournament.id)) {
            uniqueTournamentsMap.set(m.tournament.id, m.tournament);
          }
        }
        const tournList = Array.from(uniqueTournamentsMap.values());
        setTournaments(tournList);
        if (tournList.length > 0 && !selectedTournamentId) {
          setSelectedTournamentId(tournList[0].id);
        }
      }
    } catch (err: any) {
      console.error('Failed to load assigned referee matches', err);
      toast.error('Failed to load matches', err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadRoster = async (tournId: string) => {
    if (!tournId) return;
    try {
      setLoading(true);
      const res = await RefereeAPI.getTournamentRoster(tournId);
      if (res.success) {
        setRoster(res.roster || []);
      }
    } catch (err: any) {
      console.error('Failed to load tournament roster', err);
      toast.error('Failed to load roster', err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignedMatches();
  }, []);

  useEffect(() => {
    if (activeTab === 'CHECKIN' && selectedTournamentId) {
      loadRoster(selectedTournamentId);
    }
  }, [activeTab, selectedTournamentId]);

  // One-click scorecard verification
  const handleVerifyScorecard = async (matchId: string) => {
    try {
      setActionLoadingId(matchId);
      const res = await RefereeAPI.verifyMatch(matchId);
      if (res.success) {
        toast.success('Match Verified', 'Scorecard officially approved and certified.');
        setMatches((prev) =>
          prev.map((m) =>
            m.id === matchId
              ? {
                  ...m,
                  isVerified: true,
                  verifiedAt: new Date().toISOString(),
                  verifier: { username: user?.username }
                }
              : m
          )
        );
        // Refresh KPIs
        setKpis((prev) => ({
          ...prev,
          pendingValidation: Math.max(0, prev.pendingValidation - 1),
          completed: prev.completed + 1
        }));
      }
    } catch (err: any) {
      toast.error('Verification Failed', err.response?.data?.error || err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Participant check-in update
  const handleCheckInUpdate = async (
    participantId: string,
    status: 'CHECKED_IN' | 'NO_SHOW' | 'DISQUALIFIED' | 'REGISTERED',
    reason?: string
  ) => {
    try {
      setActionLoadingId(participantId);
      const res = await RefereeAPI.updateCheckIn(
        selectedTournamentId,
        participantId,
        status,
        reason
      );
      if (res.success) {
        toast.success(
          'Attendance Updated',
          `Participant marked as ${status === 'CHECKED_IN' ? 'Present' : status}.`
        );
        setRoster((prev) =>
          prev.map((p) => (p.id === participantId ? { ...p, status } : p))
        );
      }
    } catch (err: any) {
      toast.error('Check-in Failed', err.response?.data?.error || err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmDisqualify = async () => {
    if (!disqualifyModal.reason.trim()) {
      toast.warning('Reason Required', 'Please specify the infraction reason.');
      return;
    }

    await handleCheckInUpdate(
      disqualifyModal.participantId,
      'DISQUALIFIED',
      disqualifyModal.reason
    );
    setDisqualifyModal({ open: false, participantId: '', participantName: '', reason: '' });
  };

  // Determine computed match status flag
  const getMatchStatusFlag = (m: any) => {
    if (m.status === 'COMPLETED') {
      return m.isVerified ? 'COMPLETED' : 'PENDING_VALIDATION';
    }
    if (m.status === 'IN_PROGRESS') {
      return 'IN_PROGRESS';
    }
    return 'AWAITING_CHECKIN';
  };

  const filteredMatches = matches.filter((m) => {
    const q = searchQuery.toLowerCase();
    const tourneyTitle = m.tournament?.title?.toLowerCase() || '';
    const matchStr = `match #${m.matchNumber}`.toLowerCase();
    return tourneyTitle.includes(q) || matchStr.includes(q);
  });

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto py-8 px-4">
      {/* Referee Header Banner */}
      <div className="gaming-card rounded-3xl p-6 sm:p-8 border border-amber-500/30 bg-gradient-to-r from-slate-900 via-gaming-card to-amber-950/20 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center space-x-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-heading font-extrabold text-2xl text-amber-400 shadow-glow-amber">
            <ShieldCheck className="w-8 h-8 text-amber-400" />
          </div>
          <div className="space-y-1">
            <span className="text-xs font-mono text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5" /> Official Adjudication & Integrity Console
            </span>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-white">
              REFEREE VERIFICATION <span className="text-amber-400">PORTAL</span>
            </h1>
            <p className="text-xs text-slate-400">
              Welcome, official <strong className="text-white">{user?.username}</strong>. Manage match check-ins, launch control rooms, verify scorecards, and inspect tournament sub-databases.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <Link
            to="/referee/disputes"
            className="px-4 py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs font-heading font-bold flex items-center space-x-2 transition-all shadow-lg shadow-purple-600/20"
          >
            <AlertTriangle className="w-4 h-4 text-purple-400" />
            <span>Disputes Review Board</span>
            {kpis.activeDisputes > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white font-mono text-[10px]">
                {kpis.activeDisputes}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Assigned */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Assigned Matches</span>
          <p className="text-2xl font-heading font-extrabold text-white mt-1">{kpis.totalAssigned}</p>
        </div>

        {/* Awaiting Checkin */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-cyan-500/30 bg-cyan-500/5">
          <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block">Awaiting Check-in</span>
          <p className="text-2xl font-heading font-extrabold text-cyan-400 mt-1">{kpis.awaitingCheckin}</p>
        </div>

        {/* Live In-Progress */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/30 bg-amber-500/5">
          <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider block">Live Matches</span>
          <p className="text-2xl font-heading font-extrabold text-amber-400 mt-1">{kpis.inProgress}</p>
        </div>

        {/* Pending Validation */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/30 bg-amber-500/10">
          <span className="text-[10px] font-mono text-amber-300 uppercase tracking-wider block">Pending Validation</span>
          <p className="text-2xl font-heading font-extrabold text-amber-300 mt-1">{kpis.pendingValidation}</p>
        </div>

        {/* Completed */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/30 bg-emerald-500/5">
          <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider block">Completed</span>
          <p className="text-2xl font-heading font-extrabold text-emerald-400 mt-1">{kpis.completed}</p>
        </div>

        {/* Dispute Alerts */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-rose-500/30 bg-rose-500/5">
          <span className="text-[10px] font-mono text-rose-400 uppercase tracking-wider block">Active Disputes</span>
          <p className="text-2xl font-heading font-extrabold text-rose-400 mt-1">{kpis.activeDisputes}</p>
        </div>
      </div>

      {/* Tab Controls & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setActiveTab('MATCHES')}
            className={`px-4 py-2.5 rounded-xl text-xs font-heading font-bold flex items-center space-x-2 transition-all ${
              activeTab === 'MATCHES'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-glow-amber font-extrabold'
                : 'text-slate-400 hover:text-white bg-slate-800/40'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>Assigned Matches ({matches.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('CHECKIN')}
            className={`px-4 py-2.5 rounded-xl text-xs font-heading font-bold flex items-center space-x-2 transition-all ${
              activeTab === 'CHECKIN'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-glow-amber font-extrabold'
                : 'text-slate-400 hover:text-white bg-slate-800/40'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Tournament Roster Checklist</span>
          </button>
        </div>

        {activeTab === 'MATCHES' && (
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search match or tournament..."
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
            />
          </div>
        )}
      </div>

      {/* TAB 1: ASSIGNED MATCHES & MATCH CONTROL ROOMS */}
      {activeTab === 'MATCHES' && (
        <div className="space-y-4">
          {filteredMatches.length === 0 ? (
            <div className="gaming-card rounded-2xl border border-slate-800 p-12 text-center space-y-4">
              <ShieldCheck className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="font-heading font-bold text-lg text-white">No Matches Assigned</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Organizers or administrators will assign matches to your referee account as tournaments are scheduled.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredMatches.map((m) => {
                const results = m.results || [];
                const statusFlag = getMatchStatusFlag(m);

                const statusBadgeConfig = {
                  AWAITING_CHECKIN: {
                    border: 'border-cyan-500/30',
                    bg: 'bg-cyan-500/10 text-cyan-400',
                    label: 'Awaiting Check-in'
                  },
                  IN_PROGRESS: {
                    border: 'border-amber-500/30',
                    bg: 'bg-amber-500/10 text-amber-400 animate-pulse',
                    label: 'In Progress'
                  },
                  PENDING_VALIDATION: {
                    border: 'border-amber-500/30',
                    bg: 'bg-amber-500/20 text-amber-300',
                    label: 'Pending Validation'
                  },
                  COMPLETED: {
                    border: 'border-emerald-500/30',
                    bg: 'bg-emerald-500/10 text-emerald-400',
                    label: 'Completed'
                  }
                }[statusFlag];

                return (
                  <div
                    key={m.id}
                    className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/30 space-y-4 transition-all"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                      <div className="flex items-center space-x-3">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {m.round?.name || `Round ${m.round?.roundNumber}`}
                        </span>
                        <span className="font-heading font-bold text-white text-base">
                          Match #{m.matchNumber}
                        </span>
                        <span className="text-xs text-slate-400">
                          • {m.tournament?.title}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-slate-700 text-cyan-400">
                          {m.tournament?.format}
                        </span>
                      </div>

                      {/* Status Flag Badge */}
                      <div className="flex items-center space-x-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${statusBadgeConfig.border} ${statusBadgeConfig.bg}`}
                        >
                          {statusBadgeConfig.label}
                        </span>
                      </div>
                    </div>

                    {/* Competitors & Scores */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {results.length === 0 ? (
                        <div className="col-span-2 text-xs text-slate-500 py-3 text-center">
                          Awaiting match competitors to advance into fixture.
                        </div>
                      ) : (
                        results.map((res: any, idx: number) => {
                          const competitorName =
                            res.participant?.team?.name ||
                            res.participant?.user?.username ||
                            `Competitor ${idx + 1}`;

                          return (
                            <div
                              key={res.id || idx}
                              className={`p-3.5 rounded-xl border flex items-center justify-between ${
                                res.isWinner
                                  ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                                  : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
                              }`}
                            >
                              <div className="flex items-center space-x-2">
                                <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-heading font-bold text-xs text-cyan-400">
                                  {competitorName.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <span className="font-heading font-bold text-xs text-white block">
                                    {competitorName}
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-400">
                                    IGN: {res.participant?.inGameName || res.participant?.user?.username}
                                  </span>
                                </div>
                              </div>

                              <div className="text-right">
                                <span className="font-mono font-extrabold text-base text-white">
                                  {res.score} pts
                                </span>
                                {res.kills !== null && res.kills !== undefined && (
                                  <span className="block text-[10px] font-mono text-slate-400">
                                    {res.kills} Kills
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Action Buttons Bar */}
                    <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-800/80">
                      <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono">
                        {m.roomToken && (
                          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300">
                            Token: {m.roomToken}
                          </span>
                        )}
                        <span>
                          {m.isVerified && m.verifiedAt
                            ? `Verified: ${new Date(m.verifiedAt).toLocaleDateString()}`
                            : 'Score verification pending final sign-off.'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5">
                        {/* 1. Enter Match Control Room */}
                        <Link
                          to={`/referee/matches/${m.id}`}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-black text-xs font-heading font-bold shadow-glow-cyan flex items-center space-x-1.5 transition-all transform hover:-translate-y-0.5"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Enter Match Control Room</span>
                        </Link>

                        {/* 2. Inspect Tournament Sub-Database */}
                        <Link
                          to={`/organizer/tournaments/${m.tournamentId}/database`}
                          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition-colors border border-slate-700"
                        >
                          <FileText className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Inspect Database</span>
                        </Link>

                        {/* 3. Review & Verify Scorecard */}
                        <Link
                          to={`/referee/matches/${m.id}/verify`}
                          className={`px-3.5 py-2 rounded-xl text-xs font-heading font-bold transition-all flex items-center space-x-1.5 border ${
                            !m.isVerified
                              ? 'bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25'
                              : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                          }`}
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                          <span>Review Scorecard</span>
                        </Link>

                        {/* 4. One-Click Verification Button */}
                        {!m.isVerified && m.status === 'COMPLETED' && (
                          <button
                            onClick={() => handleVerifyScorecard(m.id)}
                            disabled={actionLoadingId === m.id}
                            className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-heading font-bold shadow-glow-emerald transition-all flex items-center space-x-1.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Quick Verify</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PARTICIPANT ATTENDANCE & CHECK-IN CHECKLIST */}
      {activeTab === 'CHECKIN' && (
        <div className="space-y-6">
          {/* Tournament Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="flex items-center space-x-3">
              <Trophy className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-sm font-heading font-bold text-white">Select Tournament Scoped Roster</h3>
                <p className="text-[11px] text-slate-400">
                  Switch between assigned tournaments to mark participant check-ins.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <select
                value={selectedTournamentId}
                onChange={(e) => setSelectedTournamentId(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-amber-400 font-medium"
              >
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.format})
                  </option>
                ))}
              </select>

              {selectedTournamentId && (
                <Link
                  to={`/organizer/tournaments/${selectedTournamentId}/database`}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-1.5 border border-slate-700"
                >
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Inspect Sub-DB</span>
                </Link>
              )}
            </div>
          </div>

          {/* Roster Table */}
          <div className="gaming-card rounded-2xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Player / Account</th>
                    <th className="py-3 px-4">Team Association</th>
                    <th className="py-3 px-4">In-Game Tag</th>
                    <th className="py-3 px-4">Attendance Status</th>
                    <th className="py-3 px-4 text-center">Referee Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {roster.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        No participants registered in this tournament yet.
                      </td>
                    </tr>
                  ) : (
                    roster.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-cyan-400">
                              {p.user?.username?.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-white font-semibold">{p.user?.username}</p>
                              <p className="text-[10px] text-slate-500 font-mono">{p.user?.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {p.team ? (
                            <span className="font-heading font-semibold text-white">
                              {p.team.name}{' '}
                              {p.team.tag && (
                                <span className="text-[10px] text-slate-400">[{p.team.tag}]</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-slate-500 font-mono text-[10px]">SOLO ENTRY</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-cyan-300">
                          {p.inGameName || p.user?.username}
                        </td>
                        <td className="py-3.5 px-4">
                          {p.status === 'CHECKED_IN' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle className="w-3 h-3" /> Present
                            </span>
                          ) : p.status === 'NO_SHOW' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">
                              <XCircle className="w-3 h-3" /> No Show
                            </span>
                          ) : p.status === 'DISQUALIFIED' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                              <Ban className="w-3 h-3" /> Disqualified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                              Registered
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleCheckInUpdate(p.id, 'CHECKED_IN')}
                              disabled={actionLoadingId === p.id}
                              className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${
                                p.status === 'CHECKED_IN'
                                  ? 'bg-emerald-500 text-black shadow-glow-emerald'
                                  : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20'
                              }`}
                            >
                              Present
                            </button>
                            <button
                              onClick={() => handleCheckInUpdate(p.id, 'NO_SHOW')}
                              disabled={actionLoadingId === p.id}
                              className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${
                                p.status === 'NO_SHOW'
                                  ? 'bg-slate-700 text-white'
                                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
                              }`}
                            >
                              No Show
                            </button>
                            <button
                              onClick={() =>
                                setDisqualifyModal({
                                  open: true,
                                  participantId: p.id,
                                  participantName: p.user?.username,
                                  reason: ''
                                })
                              }
                              disabled={actionLoadingId === p.id}
                              className="px-2.5 py-1 rounded-md text-[10px] font-semibold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-all"
                            >
                              DQ
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Disqualify Player Prompt Modal */}
      {disqualifyModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 text-slate-100 gaming-card space-y-4">
            <div className="flex items-center space-x-3 text-rose-400 border-b border-slate-800 pb-3">
              <Ban className="w-5 h-5" />
              <h3 className="font-heading font-bold text-lg text-white">Disqualify Competitor</h3>
            </div>
            <p className="text-xs text-slate-300">
              Are you sure you want to disqualify{' '}
              <span className="font-semibold text-rose-400">{disqualifyModal.participantName}</span>?
              This will officially revoke their attendance for this match.
            </p>
            <div className="space-y-1">
              <label className="text-xs font-mono text-slate-400">Violation Reason</label>
              <textarea
                value={disqualifyModal.reason}
                onChange={(e) =>
                  setDisqualifyModal((prev) => ({ ...prev, reason: e.target.value }))
                }
                placeholder="Rule breach, unapproved substitute, toxic conduct..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() =>
                  setDisqualifyModal({
                    open: false,
                    participantId: '',
                    participantName: '',
                    reason: ''
                  })
                }
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDisqualify}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-black text-xs font-heading font-bold shadow-glow-rose"
              >
                Confirm Disqualification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { RefereeAPI } from '../api/referee.service';
import { tournamentService } from '../api/tournament.service';
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
  ExternalLink
} from 'lucide-react';

export const RefereeDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'MATCHES' | 'CHECKIN'>('MATCHES');
  const [matches, setMatches] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('');
  const [roster, setRoster] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

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

        // Extract unique tournaments
        const uniqueTournamentsMap = new Map();
        for (const m of res.matches) {
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
    } catch (err) {
      console.error('Failed to load assigned referee matches', err);
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
    } catch (err) {
      console.error('Failed to load tournament roster', err);
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
      }
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Scorecard verification failed.');
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
        setRoster((prev) =>
          prev.map((p) => (p.id === participantId ? { ...p, status } : p))
        );
      }
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Check-in update failed.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmDisqualify = async () => {
    if (!disqualifyModal.reason.trim()) {
      alert('Please specify the infraction or disqualification rule reason.');
      return;
    }

    await handleCheckInUpdate(
      disqualifyModal.participantId,
      'DISQUALIFIED',
      disqualifyModal.reason
    );
    setDisqualifyModal({ open: false, participantId: '', participantName: '', reason: '' });
  };

  const pendingVerificationCount = matches.filter((m) => !m.isVerified).length;
  const verifiedCount = matches.filter((m) => m.isVerified).length;

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto">
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
              Welcome, official <strong className="text-white">{user?.username}</strong>. Verify match scorecards, manage player check-ins, and inspect rules compliance.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <Link
            to="/referee/disputes"
            className="px-4 py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/40 text-xs font-heading font-bold flex items-center space-x-2 transition-all shadow-lg shadow-purple-600/20"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Disputes Review Board &rarr;</span>
          </Link>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Total Assigned Matches</span>
          <p className="text-2xl font-heading font-extrabold text-white mt-1">{matches.length}</p>
        </div>
        <div className="p-5 rounded-2xl bg-slate-900 border border-amber-500/30 bg-amber-500/5">
          <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider">Pending Score Verification</span>
          <p className="text-2xl font-heading font-extrabold text-amber-400 mt-1">{pendingVerificationCount}</p>
        </div>
        <div className="p-5 rounded-2xl bg-slate-900 border border-emerald-500/30 bg-emerald-500/5">
          <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">Officially Validated</span>
          <p className="text-2xl font-heading font-extrabold text-emerald-400 mt-1">{verifiedCount}</p>
        </div>
        <div className="p-5 rounded-2xl bg-slate-900 border border-cyan-500/30 bg-cyan-500/5">
          <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">Active Tournaments Scoped</span>
          <p className="text-2xl font-heading font-extrabold text-cyan-400 mt-1">{tournaments.length}</p>
        </div>
      </div>

      {/* Tab Controls */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('MATCHES')}
          className={`px-4 py-2.5 rounded-xl text-xs font-heading font-bold flex items-center space-x-2 transition-all ${
            activeTab === 'MATCHES'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-glow-amber font-extrabold'
              : 'text-slate-400 hover:text-white bg-slate-800/40'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Assigned Matches & Scorecards ({matches.length})</span>
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
          <span>Attendance & Check-in Checklist</span>
        </button>
      </div>

      {/* TAB 1: ASSIGNED MATCHES & SCORECARD VERIFICATION */}
      {activeTab === 'MATCHES' && (
        <div className="space-y-4">
          {matches.length === 0 ? (
            <div className="gaming-card rounded-2xl border border-slate-800 p-12 text-center space-y-4">
              <ShieldCheck className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="font-heading font-bold text-lg text-white">No Matches Assigned</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Organizers or administrators will assign matches to your referee account as tournament schedules are seeded.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {matches.map((match) => {
                const results = match.results || [];

                return (
                  <div
                    key={match.id}
                    className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/30 space-y-4 transition-all"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                      <div className="flex items-center space-x-3">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {match.round?.name || `Round ${match.round?.roundNumber}`}
                        </span>
                        <span className="font-heading font-bold text-white text-sm">
                          Match #{match.matchNumber}
                        </span>
                        <span className="text-xs text-slate-400">
                          • {match.tournament?.title}
                        </span>
                      </div>

                      {/* Verification Status Pill */}
                      <div className="flex items-center space-x-3">
                        {match.isVerified ? (
                          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Validated & Approved</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Pending Referee Sign-off</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Competitors & Scorecard Grid */}
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

                    {/* Verification Actions Bar */}
                    <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-800/80">
                      <span className="text-[11px] font-mono text-slate-400">
                        {match.isVerified && match.verifiedAt ? (
                          <>Official validation committed: {new Date(match.verifiedAt).toLocaleString()}</>
                        ) : (
                          <>Confirm scores match external server stream before certifying.</>
                        )}
                      </span>

                      <div className="flex items-center space-x-3">
                        <Link
                          to={`/tournaments/${match.tournamentId}`}
                          className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors flex items-center space-x-1"
                        >
                          <span>Tournament Live</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>

                        {!match.isVerified && (
                          <button
                            onClick={() => handleVerifyScorecard(match.id)}
                            disabled={actionLoadingId === match.id}
                            className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-heading font-extrabold shadow-glow-emerald transition-all flex items-center space-x-1.5 disabled:opacity-50"
                          >
                            <Check className="w-4 h-4" />
                            <span>
                              {actionLoadingId === match.id ? 'Validating...' : 'Verify Scorecard'}
                            </span>
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
              <span className="text-xs font-mono text-slate-400 uppercase">Select Tournament:</span>
              <select
                value={selectedTournamentId}
                onChange={(e) => setSelectedTournamentId(e.target.value)}
                className="px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-heading font-semibold focus:outline-none focus:border-amber-500"
              >
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.format})
                  </option>
                ))}
              </select>
            </div>

            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search player or IGN..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              <Search className="absolute left-3 top-2 w-3.5 h-3.5 text-slate-500" />
            </div>
          </div>

          {/* Checklist Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-800/40 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Participant / IGN</th>
                  <th className="py-3 px-4">Team</th>
                  <th className="py-3 px-4">Check-In Status</th>
                  <th className="py-3 px-4 text-right">Attendance Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {roster
                  .filter(
                    (p) =>
                      !searchQuery ||
                      p.user?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      p.inGameName?.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((p) => {
                    const isCheckedIn = p.status === 'CHECKED_IN';
                    const isNoShow = p.status === 'NO_SHOW';
                    const isDisqualified = p.status === 'DISQUALIFIED';

                    const getStatusBadge = () => {
                      if (isCheckedIn) {
                        return (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-bold">
                            PRESENT
                          </span>
                        );
                      }
                      if (isNoShow) {
                        return (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono font-bold">
                            NO SHOW
                          </span>
                        );
                      }
                      if (isDisqualified) {
                        return (
                          <span className="px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 font-mono font-bold">
                            DISQUALIFIED
                          </span>
                        );
                      }
                      return (
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-500/10 border border-slate-500/30 text-slate-400 font-mono">
                          REGISTERED
                        </span>
                      );
                    };

                    return (
                      <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-heading font-bold text-xs text-white">
                              {p.user?.username.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-semibold text-white block">
                                {p.inGameName || p.user?.username}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                @{p.user?.username}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-slate-300">
                          {p.team?.name ? (
                            <span className="flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-cyan-400" />
                              {p.team.name}
                            </span>
                          ) : (
                            <span className="text-slate-500">Solo</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">{getStatusBadge()}</td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {/* Mark Present */}
                            <button
                              onClick={() => handleCheckInUpdate(p.id, 'CHECKED_IN')}
                              disabled={actionLoadingId === p.id || isCheckedIn}
                              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                                isCheckedIn
                                  ? 'bg-emerald-500/20 text-emerald-400 opacity-60 cursor-default'
                                  : 'bg-emerald-500 hover:bg-emerald-400 text-black'
                              }`}
                            >
                              Present
                            </button>

                            {/* Mark No Show */}
                            <button
                              onClick={() => handleCheckInUpdate(p.id, 'NO_SHOW')}
                              disabled={actionLoadingId === p.id || isNoShow}
                              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                                isNoShow
                                  ? 'bg-amber-500/20 text-amber-400 opacity-60 cursor-default'
                                  : 'bg-slate-800 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              No Show
                            </button>

                            {/* Disqualify */}
                            <button
                              onClick={() =>
                                setDisqualifyModal({
                                  open: true,
                                  participantId: p.id,
                                  participantName: p.inGameName || p.user?.username,
                                  reason: ''
                                })
                              }
                              disabled={actionLoadingId === p.id || isDisqualified}
                              className="px-3 py-1 rounded-lg text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all"
                            >
                              Disqualify
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Disqualify Prompt Modal */}
      {disqualifyModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-red-500/40 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center space-x-3 text-red-400">
              <Ban className="w-6 h-6" />
              <h3 className="font-heading font-bold text-base text-white">Disqualify Participant</h3>
            </div>
            <p className="text-xs text-slate-300">
              Enter the official infraction reason for disqualifying{' '}
              <strong className="text-white">{disqualifyModal.participantName}</strong>. This will be recorded in the tournament audit log.
            </p>
            <textarea
              rows={3}
              value={disqualifyModal.reason}
              onChange={(e) =>
                setDisqualifyModal((prev) => ({ ...prev, reason: e.target.value }))
              }
              placeholder="e.g. Unverified software detected, toxic chat violation, failure to check in on time..."
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-red-500 resize-none"
            />
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() =>
                  setDisqualifyModal({ open: false, participantId: '', participantName: '', reason: '' })
                }
                className="px-4 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDisqualify}
                className="px-4 py-1.5 text-xs font-heading font-bold bg-red-600 hover:bg-red-500 text-white rounded-xl shadow-lg shadow-red-600/30"
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

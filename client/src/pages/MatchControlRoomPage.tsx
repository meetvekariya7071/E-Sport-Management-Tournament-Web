import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { RefereeAPI } from '../api/referee.service';
import { useToast } from '../context/ToastContext';
import { useTournamentSocket } from '../hooks/useTournamentSocket';
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
  Check,
  Ban,
  Lock,
  Play,
  KeyRound,
  Copy,
  ArrowLeft,
  ExternalLink,
  Sparkles,
  Radio,
  FileText
} from 'lucide-react';

export const MatchControlRoomPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // Disqualification Modal State
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

  const loadMatchData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await RefereeAPI.getMatchControlRoom(id);
      if (res.success) {
        setMatch(res.match);
      }
    } catch (err: any) {
      toast.error('Failed to load match', err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatchData();
  }, [id]);

  // Real-time Socket Listener
  useTournamentSocket({
    tournamentId: match?.tournamentId,
    onMatchScoreUpdate: () => {
      loadMatchData();
    }
  });

  const handleCopyRoomToken = () => {
    if (match?.roomToken) {
      navigator.clipboard.writeText(match.roomToken);
      setCopiedToken(true);
      toast.info('Copied to Clipboard', `Room Access Token: ${match.roomToken}`);
      setTimeout(() => setCopiedToken(false), 2500);
    }
  };

  const handleUpdateCheckIn = async (
    participantId: string,
    status: 'CHECKED_IN' | 'LATE' | 'NO_SHOW' | 'DISQUALIFIED' | 'REGISTERED',
    reason?: string,
    isSubstituteApproved?: boolean
  ) => {
    if (!id) return;
    try {
      setActionLoading(true);
      const res = await RefereeAPI.updateMatchCheckIn(id, {
        participantId,
        status,
        reason,
        isSubstituteApproved
      });
      if (res.success) {
        toast.success(
          'Attendance Updated',
          `Player marked as ${status === 'CHECKED_IN' ? 'Present' : status}.`
        );
        loadMatchData();
      }
    } catch (err: any) {
      toast.error('Update Failed', err.response?.data?.error || err.message);
    } finally {
      setActionLoading(false);
      if (disqualifyModal.open) {
        setDisqualifyModal({ open: false, participantId: '', participantName: '', reason: '' });
      }
    }
  };

  const handleToggleSubstitute = async (participantId: string, currentApproved: boolean) => {
    if (!id) return;
    try {
      setActionLoading(true);
      const res = await RefereeAPI.updateMatchCheckIn(id, {
        participantId,
        isSubstituteApproved: !currentApproved
      });
      if (res.success) {
        toast.success(
          'Substitute Status Changed',
          !currentApproved ? 'Substitute approved for match entry.' : 'Substitute reverted.'
        );
        loadMatchData();
      }
    } catch (err: any) {
      toast.error('Update Failed', err.response?.data?.error || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLockRosterAndStart = async () => {
    if (!id) return;
    try {
      setActionLoading(true);
      const res = await RefereeAPI.updateMatchStatus(id, {
        status: 'IN_PROGRESS',
        lockRoster: true
      });
      if (res.success) {
        toast.success('Roster Locked & Match Started!', res.message);
        loadMatchData();
      }
    } catch (err: any) {
      toast.error('Action Failed', err.response?.data?.error || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyScorecard = async () => {
    if (!id) return;
    try {
      setActionLoading(true);
      const res = await RefereeAPI.verifyMatch(id);
      if (res.success) {
        toast.success('Scorecard Approved', 'Match results officially verified.');
        loadMatchData();
      }
    } catch (err: any) {
      toast.error('Verification Failed', err.response?.data?.error || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-slate-400 font-mono text-sm">Loading Match Control Room...</p>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="max-w-7xl mx-auto py-16 px-4 text-center space-y-4 gaming-card rounded-2xl border border-slate-800 p-8">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
        <h2 className="text-xl font-heading font-bold text-white">Match Not Found</h2>
        <p className="text-sm text-slate-400">The requested match does not exist or has not been assigned.</p>
        <Link
          to="/referee/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    );
  }

  const tournament = match.tournament;
  const isSolo = tournament?.format === 'SOLO';

  // Extract participants list from match results
  const participants = match.results?.map((r: any) => r.participant).filter(Boolean) || [];

  // Group teams for Duo/Squad
  const teamsMap = new Map();
  for (const p of participants) {
    if (p.team) {
      if (!teamsMap.has(p.team.id)) {
        teamsMap.set(p.team.id, {
          ...p.team,
          participants: [p]
        });
      } else {
        teamsMap.get(p.team.id).participants.push(p);
      }
    }
  }
  const teamsList = Array.from(teamsMap.values());

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CHECKED_IN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle className="w-3 h-3" /> Present
          </span>
        );
      case 'LATE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Clock className="w-3 h-3" /> Late
          </span>
        );
      case 'NO_SHOW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">
            <XCircle className="w-3 h-3" /> No Show
          </span>
        );
      case 'DISQUALIFIED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <Ban className="w-3 h-3" /> Disqualified
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
            Registered
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 py-8 px-4 max-w-7xl mx-auto">
      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            to="/referee/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 transition-colors font-mono mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Referee Dashboard</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-white">
              MATCH #{match.matchNumber} CONTROL ROOM
            </h1>
            <span
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold border uppercase ${
                match.status === 'IN_PROGRESS'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
                  : match.status === 'COMPLETED'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
              }`}
            >
              {match.status}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {tournament?.title} • {match.round?.name || `Round ${match.round?.roundNumber}`} •{' '}
            <span className="text-cyan-400 font-mono uppercase">{tournament?.format} FORMAT</span>
          </p>
        </div>

        {/* Score Verification & Read-only Database Inspection Actions */}
        <div className="flex items-center gap-3">
          <Link
            to={`/referee/matches/${match.id}/verify`}
            className="px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 border border-primary-500/30 text-white text-xs font-bold flex items-center gap-2 transition-colors shadow-md shadow-primary-600/20"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Review & Verify Scores</span>
          </Link>

          <Link
            to={`/organizer/tournaments/${tournament?.id}/database`}
            className="px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm"
          >
            <FileText className="w-4 h-4 text-cyan-400" />
            <span>Inspect Sub-Database</span>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </Link>
        </div>
      </div>

      {/* Lobby Room Token & Match Control Actions Banner */}
      <div className="gaming-card p-6 rounded-2xl border border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Left: Room Access Token Card */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono uppercase">
            <KeyRound className="w-4 h-4 text-cyan-400" />
            <span>Live Lobby Room Access Token</span>
          </div>
          {match.roomToken ? (
            <div className="flex items-center gap-3">
              <div className="px-5 py-3 rounded-xl bg-slate-900 border border-cyan-500/40 font-mono text-xl font-bold text-cyan-300 tracking-widest shadow-glow-cyan flex items-center gap-3">
                <span>{match.roomToken}</span>
                <button
                  onClick={handleCopyRoomToken}
                  title="Copy Token"
                  className="p-1 hover:text-white transition-colors"
                >
                  {copiedToken ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <span className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
                Token sent to all match competitors. Share with custom game lobby host if necessary.
              </span>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center gap-2.5">
              <Radio className="w-4 h-4 text-slate-500 shrink-0" />
              <span>Room access token will be auto-generated when you click 'Lock Roster & Start Match'.</span>
            </div>
          )}
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex flex-wrap items-center justify-start md:justify-end gap-3">
          {match.status !== 'IN_PROGRESS' && match.status !== 'COMPLETED' && (
            <button
              onClick={handleLockRosterAndStart}
              disabled={actionLoading}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-black font-heading font-bold text-xs tracking-wider shadow-glow-cyan flex items-center space-x-2 transition-all transform hover:-translate-y-0.5"
            >
              <Lock className="w-4 h-4" />
              <span>Lock Roster & Start Match</span>
            </button>
          )}

          {match.status === 'COMPLETED' && !match.isVerified && (
            <button
              onClick={handleVerifyScorecard}
              disabled={actionLoading}
              className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-heading font-bold text-xs tracking-wider shadow-glow-emerald flex items-center space-x-2 transition-all"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Verify & Certify Match Scores</span>
            </button>
          )}

          {match.isVerified && (
            <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              <span>Officially Certified by Referee</span>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Attendance & Roster Checklist Room */}
      <div className="gaming-card rounded-2xl border border-slate-800 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-2">
          <div>
            <h2 className="text-lg font-heading font-bold text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-cyan-400" />
              Match Check-In & Roster Checklist
            </h2>
            <p className="text-xs text-slate-400">
              Verify participant attendance, flag late arrivals or no-shows, and approve roster substitutes.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {participants.length} Competitors in Match
          </span>
        </div>

        {/* Solo Format Checklist */}
        {isSolo ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 font-mono uppercase text-[11px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Player</th>
                  <th className="py-3 px-4">In-Game Tag</th>
                  <th className="py-3 px-4">Current Status</th>
                  <th className="py-3 px-4 text-center">Attendance Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {participants.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 font-bold">
                          {p.user?.username?.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white font-semibold">{p.user?.username}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{p.user?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-cyan-300">
                      {p.inGameName || p.user?.username}
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(p.status)}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleUpdateCheckIn(p.id, 'CHECKED_IN')}
                          disabled={actionLoading}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                            p.status === 'CHECKED_IN'
                              ? 'bg-emerald-500 text-black shadow-glow-emerald'
                              : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20'
                          }`}
                        >
                          Present
                        </button>
                        <button
                          onClick={() => handleUpdateCheckIn(p.id, 'LATE')}
                          disabled={actionLoading}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                            p.status === 'LATE'
                              ? 'bg-amber-500 text-black shadow-glow-amber'
                              : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20'
                          }`}
                        >
                          Late
                        </button>
                        <button
                          onClick={() => handleUpdateCheckIn(p.id, 'NO_SHOW')}
                          disabled={actionLoading}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
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
                          disabled={actionLoading}
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-all"
                        >
                          Disqualify
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Duo & Squad Multi-Player Team Checklist */
          <div className="space-y-6">
            {teamsList.map((team: any) => (
              <div
                key={team.id}
                className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4"
              >
                {/* Team Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-3 gap-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600/30 to-cyan-500/30 border border-purple-500/40 flex items-center justify-center text-white font-bold font-heading">
                      {team.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-base font-heading font-bold text-white">{team.name}</h3>
                        {team.tag && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-cyan-400">
                            [{team.tag}]
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Captain: <span className="text-slate-200">{team.captain?.username}</span> • Code:{' '}
                        <span className="font-mono text-cyan-300">{team.inviteCode}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Team Roster Members */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-[10px] font-mono text-slate-400 uppercase">
                      <tr>
                        <th className="py-2 px-3">Roster Member</th>
                        <th className="py-2 px-3">IGN</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3 text-center">Substitute Approval</th>
                        <th className="py-2 px-3 text-center">Attendance Controls</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {team.participants?.map((p: any) => (
                        <tr key={p.id} className="hover:bg-slate-800/20">
                          <td className="py-2.5 px-3">
                            <span className="text-white font-medium">{p.user?.username}</span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-cyan-300">{p.inGameName || '—'}</td>
                          <td className="py-2.5 px-3">{getStatusBadge(p.status)}</td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => handleToggleSubstitute(p.id, p.isSubstituteApproved)}
                              disabled={actionLoading}
                              className={`px-3 py-1 rounded-md text-[10px] font-mono font-semibold transition-colors ${
                                p.isSubstituteApproved
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                  : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                              }`}
                            >
                              {p.isSubstituteApproved ? '✓ Approved Sub' : 'Regular Starter'}
                            </button>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleUpdateCheckIn(p.id, 'CHECKED_IN')}
                                disabled={actionLoading}
                                className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-all ${
                                  p.status === 'CHECKED_IN'
                                    ? 'bg-emerald-500 text-black shadow-glow-emerald'
                                    : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20'
                                }`}
                              >
                                Present
                              </button>
                              <button
                                onClick={() => handleUpdateCheckIn(p.id, 'LATE')}
                                disabled={actionLoading}
                                className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-all ${
                                  p.status === 'LATE'
                                    ? 'bg-amber-500 text-black shadow-glow-amber'
                                    : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20'
                                }`}
                              >
                                Late
                              </button>
                              <button
                                onClick={() => handleUpdateCheckIn(p.id, 'NO_SHOW')}
                                disabled={actionLoading}
                                className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-all ${
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
                                disabled={actionLoading}
                                className="px-2 py-1 rounded-md text-[10px] font-semibold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-all"
                              >
                                DQ
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
                onClick={() =>
                  handleUpdateCheckIn(
                    disqualifyModal.participantId,
                    'DISQUALIFIED',
                    disqualifyModal.reason
                  )
                }
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

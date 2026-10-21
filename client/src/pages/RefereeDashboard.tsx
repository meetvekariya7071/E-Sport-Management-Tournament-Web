import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  UserCheck,
  UserX,
  Ban,
  Search,
  Filter,
  RefreshCw,
  Trophy,
  ExternalLink,
  FileCheck,
  MessageSquare,
  HelpCircle,
  Eye,
  ShieldAlert
} from 'lucide-react';
import { refereeApi, RefereeMatch, CheckInParticipant } from '../services/referee.service';
import { disputeApi, DisputeItem } from '../services/dispute.service';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { SanctionModal } from '../components/SanctionModal';

export const RefereeDashboard: React.FC = () => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'matches' | 'checkin' | 'disputes'>('matches');
  const [matches, setMatches] = useState<RefereeMatch[]>([]);
  const [checkInList, setCheckInList] = useState<CheckInParticipant[]>([]);
  const [disputes, setDisputes] = useState<DisputeItem[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('');
  const [tournamentsList, setTournamentsList] = useState<Array<{ id: string; title: string }>>([]);

  const [loading, setLoading] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [showVerifyModal, setShowVerifyModal] = useState<string | null>(null);
  const [updatingParticipantId, setUpdatingParticipantId] = useState<string | null>(null);
  const [checkInSearch, setCheckInSearch] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [sanctionTarget, setSanctionTarget] = useState<{
    id: string;
    name: string;
    tournamentId?: string;
  } | null>(null);

  // Load matches
  const loadMatches = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const data = await refereeApi.getAssignedMatches();
      setMatches(data || []);

      // Extract unique tournaments
      const uniqueTournaments = Array.from(
        new Map(data.map((m) => [m.tournament.id, { id: m.tournament.id, title: m.tournament.title }])).values()
      );
      setTournamentsList(uniqueTournaments);

      if (uniqueTournaments.length > 0 && !selectedTournamentId) {
        setSelectedTournamentId(uniqueTournaments[0].id);
      }
    } catch (err: any) {
      setActionError(err.response?.data?.error || err.message || 'Failed to load assigned matches');
    } finally {
      setLoading(false);
    }
  };

  // Load check-in roster
  const loadCheckInList = async (tournamentId: string) => {
    if (!tournamentId) return;
    setLoading(true);
    try {
      const data = await refereeApi.getCheckInList(tournamentId);
      setCheckInList(data || []);
    } catch (err: any) {
      setActionError(err.response?.data?.error || err.message || 'Failed to load check-in list');
    } finally {
      setLoading(false);
    }
  };

  // Load disputes
  const loadDisputes = async () => {
    try {
      const data = await disputeApi.getUserDisputes();
      setDisputes(data || []);
    } catch (err) {
      // quiet fallback
    }
  };

  useEffect(() => {
    loadMatches();
    loadDisputes();
  }, []);

  useEffect(() => {
    if (activeTab === 'checkin' && selectedTournamentId) {
      loadCheckInList(selectedTournamentId);
    }
  }, [activeTab, selectedTournamentId]);

  // Handle Scorecard Verification
  const handleVerifyScorecard = async (matchId: string) => {
    setVerifyingId(matchId);
    setActionError(null);
    try {
      await refereeApi.verifyMatch(matchId, verificationNotes.trim() || undefined);
      setActionSuccess('Scorecard officially validated & locked by referee.');
      setShowVerifyModal(null);
      setVerificationNotes('');
      await loadMatches();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setActionError(err.response?.data?.error || err.message || 'Failed to verify scorecard');
    } finally {
      setVerifyingId(null);
    }
  };

  // Handle Check-In Status update
  const handleUpdateCheckIn = async (
    participantId: string,
    status: 'PRESENT' | 'NO_SHOW' | 'DISQUALIFIED'
  ) => {
    let reason = undefined;
    if (status === 'DISQUALIFIED') {
      const inputReason = window.prompt('Specify reason for disqualification (e.g. Unregistered smurf, rule infraction):');
      if (inputReason === null) return; // User cancelled
      reason = inputReason || 'Disqualified for tournament rule infraction';
    }

    setUpdatingParticipantId(participantId);
    setActionError(null);
    try {
      await refereeApi.updateParticipantStatus(participantId, status, reason);
      setActionSuccess(`Player attendance updated to ${status}.`);
      setCheckInList((prev) =>
        prev.map((p) => (p.id === participantId ? { ...p, status } : p))
      );
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: any) {
      setActionError(err.response?.data?.error || err.message || 'Failed to update check-in status');
    } finally {
      setUpdatingParticipantId(null);
    }
  };

  // KPI Calculations
  const verifiedCount = matches.filter((m) => m.isVerified).length;
  const pendingCount = matches.filter((m) => !m.isVerified && m.results.length > 0).length;
  const openDisputesCount = disputes.filter((d) => d.status === 'OPEN' || d.status === 'INVESTIGATING').length;

  const filteredMatches = selectedTournamentId
    ? matches.filter((m) => m.tournamentId === selectedTournamentId)
    : matches;

  const filteredCheckIn = checkInList.filter((p) => {
    if (!checkInSearch) return true;
    const q = checkInSearch.toLowerCase();
    return (
      p.user.username.toLowerCase().includes(q) ||
      (p.inGameName && p.inGameName.toLowerCase().includes(q)) ||
      (p.team?.name && p.team.name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-glow-amber">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-heading font-bold text-white tracking-wide">
                  REFEREE PORTAL
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full uppercase">
                  Official Adjudication
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Verify scorecards, monitor player check-in checklist, and review contested match disputes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                loadMatches();
                if (selectedTournamentId) loadCheckInList(selectedTournamentId);
                loadDisputes();
              }}
              disabled={loading}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Global KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800">
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">
              Assigned Matches
            </span>
            <span className="text-xl font-heading font-bold text-white mt-0.5 block">
              {matches.length}
            </span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
            <span className="text-[10px] text-amber-400 font-mono uppercase tracking-wider block">
              Pending Validation
            </span>
            <span className="text-xl font-heading font-bold text-amber-400 mt-0.5 block">
              {pendingCount}
            </span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
            <span className="text-[10px] text-emerald-400 font-mono uppercase tracking-wider block">
              Scores Verified
            </span>
            <span className="text-xl font-heading font-bold text-emerald-400 mt-0.5 block">
              {verifiedCount}
            </span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
            <span className="text-[10px] text-rose-400 font-mono uppercase tracking-wider block">
              Open Disputes
            </span>
            <span className="text-xl font-heading font-bold text-rose-400 mt-0.5 block">
              {openDisputesCount}
            </span>
          </div>
        </div>
      </div>

      {/* Alert Messages */}
      {actionSuccess && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-xs text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2.5 text-xs text-red-300">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab('matches')}
          className={`pb-3 px-4 text-xs font-heading font-semibold tracking-wide border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'matches'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Assigned Matches ({matches.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('checkin')}
          className={`pb-3 px-4 text-xs font-heading font-semibold tracking-wide border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'checkin'
              ? 'border-cyan-400 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Check-in Attendance</span>
        </button>

        <Link
          to="/referee/disputes"
          className="pb-3 px-4 text-xs font-heading font-semibold tracking-wide border-b-2 border-transparent text-slate-400 hover:text-slate-200 transition-all flex items-center gap-2"
        >
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span>Disputes Review Board</span>
          {openDisputesCount > 0 && (
            <span className="px-1.5 py-0.2 text-[9px] font-mono bg-rose-500/20 text-rose-400 rounded-full">
              {openDisputesCount}
            </span>
          )}
        </Link>
      </div>

      {/* TAB 1: ASSIGNED MATCHES */}
      {activeTab === 'matches' && (
        <div className="space-y-4">
          {/* Tournament filter selector */}
          {tournamentsList.length > 1 && (
            <div className="flex items-center gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-400 font-mono">Filter by Tournament:</span>
              <select
                value={selectedTournamentId}
                onChange={(e) => setSelectedTournamentId(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">All Assigned Tournaments ({matches.length})</option>
                {tournamentsList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {filteredMatches.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
              <Trophy className="w-10 h-10 text-slate-600 mx-auto mb-3 opacity-50" />
              <h3 className="text-sm font-heading font-bold text-white">No Assigned Matches Found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Organizers assign referees to matches during bracket scheduling. Check back when fixtures are generated.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMatches.map((match) => {
                const hasScores = match.results.length > 0;
                const isDisputed = match.status === 'DISPUTED' || (match.disputes && match.disputes.some(d => d.status === 'OPEN'));

                return (
                  <div
                    key={match.id}
                    className={`bg-slate-900 border rounded-2xl p-5 transition-all relative overflow-hidden ${
                      isDisputed
                        ? 'border-rose-500/40 bg-rose-950/10'
                        : match.isVerified
                        ? 'border-emerald-500/30'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Top Row: Tournament & Round info */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div>
                        <span className="text-[10px] text-cyan-400 font-mono font-semibold uppercase tracking-wider">
                          {match.tournament.title}
                        </span>
                        <h3 className="text-sm font-heading font-bold text-white">
                          Match #{match.matchNumber} &bull; {match.round.name}
                        </h3>
                      </div>

                      {/* Verification Badge */}
                      {match.isVerified ? (
                        <span className="px-2.5 py-1 text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>VERIFIED</span>
                        </span>
                      ) : isDisputed ? (
                        <span className="px-2.5 py-1 text-[10px] font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 rounded-full flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>DISPUTED</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>UNVERIFIED</span>
                        </span>
                      )}
                    </div>

                    {/* Competitors Scorecard Table */}
                    <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800/80 my-3 divide-y divide-slate-800/50">
                      {match.results.length === 0 ? (
                        <div className="py-3 text-center text-xs text-slate-500">
                          Scores pending organizer submission
                        </div>
                      ) : (
                        match.results.map((res) => {
                          const competitorName =
                            res.participant.team?.name ||
                            res.participant.user?.username ||
                            'Player';

                          return (
                            <div
                              key={res.id}
                              className="py-2 first:pt-0 last:pb-0 flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-mono font-bold ${
                                    res.isWinner
                                      ? 'bg-amber-400 text-black shadow-glow-amber'
                                      : 'bg-slate-800 text-slate-400'
                                  }`}
                                >
                                  {res.isWinner ? 'W' : '-'}
                                </span>
                                <span
                                  className={`text-xs font-semibold ${
                                    res.isWinner ? 'text-white' : 'text-slate-300'
                                  }`}
                                >
                                  {competitorName}
                                </span>
                              </div>

                              <div className="flex items-center gap-3 text-xs font-mono">
                                {res.kills !== undefined && res.kills !== null && (
                                  <span className="text-slate-400">
                                    {res.kills} <span className="text-[10px] text-slate-600">K</span>
                                  </span>
                                )}
                                <span className="font-bold text-white px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                                  {res.score} pts
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Verification Context */}
                    {match.isVerified && (
                      <div className="text-[11px] text-slate-400 bg-emerald-950/20 border border-emerald-500/20 rounded-lg p-2.5 mb-3">
                        <div className="flex items-center justify-between font-mono text-[10px] text-emerald-400">
                          <span>Validated by {match.verifiedBy?.username || 'Referee'}</span>
                          <span>{match.verifiedAt ? new Date(match.verifiedAt).toLocaleTimeString() : ''}</span>
                        </div>
                        {match.verificationNotes && (
                          <p className="mt-1 text-slate-300 text-[11px] italic">
                            "{match.verificationNotes}"
                          </p>
                        )}
                      </div>
                    )}

                    {/* Bottom Action Controls */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                      <Link
                        to={`/tournaments/${match.tournamentId}`}
                        className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Tournament</span>
                      </Link>

                      <div className="flex items-center space-x-2">
                        <Link
                          to={`/referee/matches/${match.id}/verify`}
                          className={`px-3.5 py-1.5 text-xs font-heading font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                            match.isVerified
                              ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                              : 'bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-400 hover:to-cyan-300 text-black shadow-glow-cyan'
                          }`}
                        >
                          <FileCheck className="w-3.5 h-3.5" />
                          <span>{match.isVerified ? 'Review Scorecard' : 'Verify & Sign-off'}</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PARTICIPANT CHECK-IN CHECKLIST */}
      {activeTab === 'checkin' && (
        <div className="space-y-4">
          {/* Header Controls: Tournament Dropdown & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 font-mono">Tournament:</span>
              <select
                value={selectedTournamentId}
                onChange={(e) => setSelectedTournamentId(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                {tournamentsList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={checkInSearch}
                onChange={(e) => setCheckInSearch(e.target.value)}
                placeholder="Search player, IGN, or team..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Roster Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Player / Account</th>
                    <th className="py-3 px-4">In-Game Name</th>
                    <th className="py-3 px-4">Team</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Attendance Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredCheckIn.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        {loading ? 'Loading participants...' : 'No participants found for this tournament.'}
                      </td>
                    </tr>
                  ) : (
                    filteredCheckIn.map((participant) => {
                      const isPresent = participant.status === 'PRESENT' || participant.status === 'CHECKED_IN';
                      const isNoShow = participant.status === 'NO_SHOW';
                      const isDQ = participant.status === 'DISQUALIFIED';

                      return (
                        <tr
                          key={participant.id}
                          className="hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="font-semibold text-white">
                              {participant.user.username}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {participant.user.email}
                            </div>
                          </td>

                          <td className="py-3 px-4 font-mono font-medium text-slate-300">
                            {participant.inGameName || '-'}
                          </td>

                          <td className="py-3 px-4">
                            {participant.team ? (
                              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-cyan-400 text-[11px]">
                                {participant.team.name}
                              </span>
                            ) : (
                              <span className="text-slate-500 font-mono text-[11px]">SOLO</span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            {isPresent ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                PRESENT
                              </span>
                            ) : isNoShow ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                NO SHOW
                              </span>
                            ) : isDQ ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-500/15 text-red-400 border border-red-500/30">
                                DISQUALIFIED
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                REGISTERED
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {/* Present Button */}
                              <button
                                onClick={() => handleUpdateCheckIn(participant.id, 'PRESENT')}
                                disabled={updatingParticipantId === participant.id || isPresent}
                                title="Mark Present"
                                className="px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors flex items-center gap-1 text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/30 disabled:opacity-30"
                              >
                                <UserCheck className="w-3 h-3" />
                                <span>Present</span>
                              </button>

                              {/* No Show Button */}
                              <button
                                onClick={() => handleUpdateCheckIn(participant.id, 'NO_SHOW')}
                                disabled={updatingParticipantId === participant.id || isNoShow}
                                title="Mark as No Show"
                                className="px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors flex items-center gap-1 text-amber-400 hover:bg-amber-500/10 border border-amber-500/30 disabled:opacity-30"
                              >
                                <UserX className="w-3 h-3" />
                                <span>No Show</span>
                              </button>

                              {/* Disqualify Button */}
                              <button
                                onClick={() => handleUpdateCheckIn(participant.id, 'DISQUALIFIED')}
                                disabled={updatingParticipantId === participant.id || isDQ}
                                title="Disqualify Player"
                                className="px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors flex items-center gap-1 text-red-400 hover:bg-red-500/10 border border-red-500/30 disabled:opacity-30"
                              >
                                <Ban className="w-3 h-3" />
                                <span>DQ</span>
                              </button>

                              {/* Disciplinary Sanction Button */}
                              <button
                                onClick={() =>
                                  setSanctionTarget({
                                    id: participant.id,
                                    name: participant.user.username,
                                    tournamentId: participant.tournamentId
                                  })
                                }
                                title="Issue Official Sanction (Warning, DQ, Escalate)"
                                className="px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors flex items-center gap-1 text-purple-400 hover:bg-purple-500/10 border border-purple-500/30"
                              >
                                <ShieldAlert className="w-3 h-3" />
                                <span>Sanction</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Score Verification Confirmation Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl border-t-2 border-t-emerald-500">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-heading font-bold text-white">
                  Validate Official Scorecard
                </h3>
                <p className="text-xs text-slate-400">
                  Seal and officially lock final match results.
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono uppercase tracking-wider">
                Verification Notes / Evidence (Optional)
              </label>
              <textarea
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                placeholder="e.g. Cross-referenced replay logs; no infractions detected."
                rows={3}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowVerifyModal(null);
                  setVerificationNotes('');
                }}
                disabled={verifyingId !== null}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleVerifyScorecard(showVerifyModal)}
                disabled={verifyingId !== null}
                className="px-5 py-2 text-xs font-bold text-black bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-glow-emerald flex items-center gap-1.5"
              >
                {verifyingId !== null ? (
                  <span>Sealing...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm & Lock Scores</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disciplinary Sanction Modal */}
      {sanctionTarget && (
        <SanctionModal
          isOpen={true}
          onClose={() => setSanctionTarget(null)}
          targetId={sanctionTarget.id}
          targetName={sanctionTarget.name}
          tournamentId={sanctionTarget.tournamentId}
          onSuccess={() => {
            if (selectedTournamentId) {
              loadCheckInList(selectedTournamentId);
            }
          }}
        />
      )}
    </div>
  );
};

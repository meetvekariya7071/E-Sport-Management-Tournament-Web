import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { DisputeAPI, DisputeItem } from '../api/dispute.service';
import { tournamentService } from '../api/tournament.service';
import {
  ShieldAlert,
  AlertCircle,
  CheckCircle,
  XCircle,
  ExternalLink,
  MessageSquare,
  Search,
  Filter,
  Check,
  X,
  Edit3,
  Trophy,
  Gamepad2,
  Clock
} from 'lucide-react';

export const DisputesReviewBoard: React.FC = () => {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<DisputeItem[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Overwrite Score Modal State
  const [scoreModal, setScoreModal] = useState<{
    open: boolean;
    dispute: DisputeItem | null;
    resolutionNote: string;
    results: Array<{
      participantId: string;
      participantName: string;
      score: number;
      kills: number;
      isWinner: boolean;
    }>;
  }>({
    open: false,
    dispute: null,
    resolutionNote: '',
    results: []
  });

  // Dismiss Modal State
  const [dismissModal, setDismissModal] = useState<{
    open: boolean;
    disputeId: string;
    note: string;
  }>({
    open: false,
    disputeId: '',
    note: ''
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [disputesRes, tournList] = await Promise.all([
        DisputeAPI.getAllDisputes({
          tournamentId: selectedTournamentId !== 'ALL' ? selectedTournamentId : undefined,
          status: selectedStatus !== 'ALL' ? selectedStatus : undefined
        }),
        tournamentService.getPublicTournaments().catch(() => [])
      ]);

      setDisputes(disputesRes.disputes || []);
      setTournaments(tournList || []);
    } catch (err) {
      console.error('Failed to load disputes review board', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedTournamentId, selectedStatus]);

  // Action: Mark Investigating
  const handleInvestigate = async (disputeId: string) => {
    try {
      setActionLoadingId(disputeId);
      await DisputeAPI.resolveDispute(disputeId, {
        status: 'INVESTIGATING',
        resolutionNote: 'Case has been assigned and is under active investigation by tournament referee board.'
      });
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Failed to update dispute status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Open Score Overwrite Modal
  const openOverwriteScoreModal = (dispute: DisputeItem) => {
    const matchResults = dispute.match?.results || [];
    const formattedResults = matchResults.map((r: any) => ({
      participantId: r.participantId,
      participantName:
        r.participant?.team?.name ||
        r.participant?.user?.username ||
        'Competitor',
      score: r.score || 0,
      kills: r.kills || 0,
      isWinner: r.isWinner || false
    }));

    setScoreModal({
      open: true,
      dispute,
      resolutionNote: 'Score dispute verified from match vod. Corrected scorecard officially committed.',
      results: formattedResults
    });
  };

  // Submit Score Overwrite & Resolution
  const handleConfirmScoreOverwrite = async () => {
    if (!scoreModal.dispute) return;
    if (!scoreModal.resolutionNote.trim()) {
      alert('Please specify the resolution note explaining the score correction.');
      return;
    }

    try {
      setActionLoadingId(scoreModal.dispute.id);
      await DisputeAPI.resolveDispute(scoreModal.dispute.id, {
        status: 'RESOLVED',
        resolutionNote: scoreModal.resolutionNote,
        overwriteScore: {
          matchId: scoreModal.dispute.matchId || scoreModal.dispute.match?.id,
          results: scoreModal.results.map((r) => ({
            participantId: r.participantId,
            score: Number(r.score),
            kills: Number(r.kills),
            isWinner: r.isWinner
          }))
        }
      });

      setScoreModal({ open: false, dispute: null, resolutionNote: '', results: [] });
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Failed to overwrite match score.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Submit Dismissal
  const handleConfirmDismiss = async () => {
    if (!dismissModal.note.trim()) {
      alert('Please enter justification for dismissing this dispute ticket.');
      return;
    }

    try {
      setActionLoadingId(dismissModal.disputeId);
      await DisputeAPI.resolveDispute(dismissModal.disputeId, {
        status: 'DISMISSED',
        resolutionNote: dismissModal.note
      });

      setDismissModal({ open: false, disputeId: '', note: '' });
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Failed to dismiss dispute.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const openCount = disputes.filter((d) => d.status === 'OPEN').length;
  const investigatingCount = disputes.filter((d) => d.status === 'INVESTIGATING').length;
  const resolvedCount = disputes.filter((d) => d.status === 'RESOLVED').length;
  const dismissedCount = disputes.filter((d) => d.status === 'DISMISSED').length;

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="gaming-card rounded-3xl p-6 sm:p-8 border border-purple-500/30 bg-gradient-to-r from-slate-900 via-gaming-card to-purple-950/20 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center space-x-5">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center font-heading font-extrabold text-2xl text-purple-400 shadow-lg shadow-purple-600/20">
            <ShieldAlert className="w-8 h-8 text-purple-400" />
          </div>
          <div className="space-y-1">
            <span className="text-xs font-mono text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> Adjudication Review Board
            </span>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-white">
              DISPUTES & GRIEVANCE <span className="text-purple-400">BOARD</span>
            </h1>
            <p className="text-xs text-slate-400">
              Review filed cheating allegations, rule infractions, and score discrepancies across tournaments.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/30 bg-amber-500/5">
          <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider">Open Tickets</span>
          <p className="text-2xl font-heading font-extrabold text-amber-400 mt-1">{openCount}</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-blue-500/30 bg-blue-500/5">
          <span className="text-[10px] font-mono text-blue-400 uppercase tracking-wider">Investigating</span>
          <p className="text-2xl font-heading font-extrabold text-blue-400 mt-1">{investigatingCount}</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/30 bg-emerald-500/5">
          <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">Resolved</span>
          <p className="text-2xl font-heading font-extrabold text-emerald-400 mt-1">{resolvedCount}</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-700 bg-slate-800/30">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Dismissed</span>
          <p className="text-2xl font-heading font-extrabold text-slate-400 mt-1">{dismissedCount}</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          {['ALL', 'OPEN', 'INVESTIGATING', 'RESOLVED', 'DISMISSED'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                selectedStatus === st
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'text-slate-400 hover:text-white bg-slate-800/60'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono text-slate-400 uppercase">Tournament:</span>
          <select
            value={selectedTournamentId}
            onChange={(e) => setSelectedTournamentId(e.target.value)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
          >
            <option value="ALL">All Tournaments</option>
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tickets List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-20 text-slate-500">
            <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="font-mono text-xs">Loading disputes review board...</p>
          </div>
        ) : disputes.length === 0 ? (
          <div className="gaming-card rounded-2xl border border-slate-800 p-12 text-center space-y-4">
            <CheckCircle className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="font-heading font-bold text-lg text-white">No Tickets in this Category</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              There are no dispute tickets matching your current filter selection.
            </p>
          </div>
        ) : (
          disputes.map((dispute) => {
            const isPending = dispute.status === 'OPEN' || dispute.status === 'INVESTIGATING';

            const getStatusPill = (status: string) => {
              switch (status) {
                case 'OPEN':
                  return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
                case 'INVESTIGATING':
                  return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
                case 'RESOLVED':
                  return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
                case 'DISMISSED':
                  return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
                default:
                  return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
              }
            };

            return (
              <div
                key={dispute.id}
                className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-purple-500/30 space-y-4 transition-all"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center space-x-3">
                    <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border uppercase font-bold ${getStatusPill(dispute.status)}`}>
                      {dispute.status}
                    </span>
                    <span className="text-xs font-mono font-bold text-purple-400 uppercase">
                      {dispute.reason.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      Filed: {new Date(dispute.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="text-xs font-heading font-bold text-slate-300">
                    {dispute.tournament?.title} {dispute.match ? `• Match #${dispute.match.matchNumber}` : ''}
                  </div>
                </div>

                {/* Body */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left 2 Cols: Details & Proof */}
                  <div className="md:col-span-2 space-y-3">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-slate-500 block mb-1">
                        Reported By Participant:
                      </span>
                      <span className="font-semibold text-white text-xs">
                        {dispute.raisedBy.username}{' '}
                        <span className="text-slate-400 font-normal">({dispute.raisedBy.email})</span>
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-mono uppercase text-slate-500 block mb-1">
                        Incident Description:
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed bg-slate-800/40 p-3 rounded-xl border border-slate-700/60">
                        {dispute.description}
                      </p>
                    </div>

                    {dispute.proofUrl && (
                      <div className="flex items-center space-x-2 text-xs text-cyan-400 pt-1">
                        <ExternalLink className="w-3.5 h-3.5" />
                        <a
                          href={dispute.proofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline font-mono"
                        >
                          Inspect Submitted Proof Evidence
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Right Col: Resolution Verdict or Action Panel */}
                  <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-3 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                        Adjudication Verdict:
                      </span>
                      {dispute.resolutionNote ? (
                        <div className="space-y-1">
                          <p className="text-xs text-purple-200 italic">
                            "{dispute.resolutionNote}"
                          </p>
                          {dispute.resolvedBy && (
                            <span className="text-[10px] font-mono text-slate-400 block pt-1">
                              By: {dispute.resolvedBy.username}
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">
                          No resolution committed yet. Case is open for referee review.
                        </p>
                      )}
                    </div>

                    {/* Action Buttons for Referees / Organizers */}
                    {isPending && (
                      <div className="space-y-2 pt-2 border-t border-slate-700">
                        {dispute.status === 'OPEN' && (
                          <button
                            onClick={() => handleInvestigate(dispute.id)}
                            disabled={actionLoadingId === dispute.id}
                            className="w-full py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/40 rounded-xl text-xs font-heading font-bold transition-all disabled:opacity-50"
                          >
                            Mark as Investigating
                          </button>
                        )}

                        <button
                          onClick={() => openOverwriteScoreModal(dispute)}
                          disabled={actionLoadingId === dispute.id}
                          className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-xs font-heading font-extrabold transition-all shadow-glow-emerald disabled:opacity-50 flex items-center justify-center space-x-1.5"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Accept Dispute & Overwrite Score</span>
                        </button>

                        <button
                          onClick={() =>
                            setDismissModal({
                              open: true,
                              disputeId: dispute.id,
                              note: ''
                            })
                          }
                          disabled={actionLoadingId === dispute.id}
                          className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-heading font-bold transition-all disabled:opacity-50"
                        >
                          Dismiss Dispute
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Overwrite Score & Resolve */}
      {scoreModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-emerald-500/40 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center space-x-3 text-emerald-400 border-b border-slate-800 pb-3">
              <Edit3 className="w-6 h-6" />
              <div>
                <h3 className="font-heading font-bold text-base text-white">
                  Accept Dispute & Correct Scores
                </h3>
                <p className="text-xs text-slate-400">
                  {scoreModal.dispute?.tournament?.title} • Match #{scoreModal.dispute?.match?.matchNumber}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Update competitor scores and declare the official winner. When submitted, the leaderboard and brackets will be instantly recalculated and participants notified.
            </p>

            {/* Scorecard Inputs */}
            <div className="space-y-3">
              {scoreModal.results.map((res, idx) => (
                <div
                  key={res.participantId}
                  className="p-3 bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="winnerSelection"
                      checked={res.isWinner}
                      onChange={() => {
                        setScoreModal((prev) => ({
                          ...prev,
                          results: prev.results.map((r, i) => ({
                            ...r,
                            isWinner: i === idx
                          }))
                        }));
                      }}
                      className="text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="font-heading font-bold text-xs text-white">
                      {res.participantName}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div>
                      <label className="text-[10px] font-mono text-slate-400 block">Score</label>
                      <input
                        type="number"
                        value={res.score}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setScoreModal((prev) => ({
                            ...prev,
                            results: prev.results.map((r, i) =>
                              i === idx ? { ...r, score: val } : r
                            )
                          }));
                        }}
                        className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white font-mono text-right"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-slate-400 block">Kills</label>
                      <input
                        type="number"
                        value={res.kills}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setScoreModal((prev) => ({
                            ...prev,
                            results: prev.results.map((r, i) =>
                              i === idx ? { ...r, kills: val } : r
                            )
                          }));
                        }}
                        className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white font-mono text-right"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Resolution Note */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 font-mono uppercase mb-1">
                Official Referee Verdict / Explanation *
              </label>
              <textarea
                rows={3}
                value={scoreModal.resolutionNote}
                onChange={(e) =>
                  setScoreModal((prev) => ({ ...prev, resolutionNote: e.target.value }))
                }
                placeholder="Detail the corrected scores based on vod evidence..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-800">
              <button
                onClick={() =>
                  setScoreModal({ open: false, dispute: null, resolutionNote: '', results: [] })
                }
                className="px-4 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmScoreOverwrite}
                className="px-5 py-2 text-xs font-heading font-extrabold bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl shadow-glow-emerald"
              >
                Commit Corrected Scorecard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Dismiss Dispute */}
      {dismissModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="font-heading font-bold text-base text-white">
              Dismiss Dispute Ticket
            </h3>
            <p className="text-xs text-slate-300">
              Provide justification for dismissing this ticket (e.g. insufficient video evidence, within official margin of error).
            </p>
            <textarea
              rows={3}
              value={dismissModal.note}
              onChange={(e) =>
                setDismissModal((prev) => ({ ...prev, note: e.target.value }))
              }
              placeholder="e.g. Reviewed referee log; score matches API telemetry accurately."
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 resize-none"
            />
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setDismissModal({ open: false, disputeId: '', note: '' })}
                className="px-4 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDismiss}
                className="px-4 py-1.5 text-xs font-heading font-bold bg-slate-700 hover:bg-slate-600 text-white rounded-xl"
              >
                Confirm Dismissal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

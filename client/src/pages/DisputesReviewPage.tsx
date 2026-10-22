import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  ExternalLink,
  MessageSquare,
  RefreshCw,
  Trophy,
  User,
  Clock,
  Edit3,
  Check,
  X,
  Gavel,
  ShieldCheck,
  Award,
  MinusCircle
} from 'lucide-react';
import { disputeApi, DisputeItem } from '../services/dispute.service';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export const DisputesReviewPage: React.FC = () => {
  const { user, role } = useAuth();

  const [disputes, setDisputes] = useState<DisputeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [selectedDispute, setSelectedDispute] = useState<DisputeItem | null>(null);

  // Uphold / Dismiss / Investigate modal states
  const [modalAction, setModalAction] = useState<'UPHOLD' | 'DISMISS' | 'INVESTIGATE' | null>(null);
  const [upholdType, setUpholdType] = useState<'FORFEIT_WALKOVER' | 'DOCK_POINTS' | 'OVERWRITE_SCORES'>('FORFEIT_WALKOVER');
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Overturn fields
  const [forfeitWinnerId, setForfeitWinnerId] = useState<string>('');
  const [dockedParticipantId, setDockedParticipantId] = useState<string>('');
  const [pointsDeducted, setPointsDeducted] = useState<number>(3);
  const [scoreAdjustments, setScoreAdjustments] = useState<
    Array<{
      participantId: string;
      competitorName: string;
      score: number;
      kills: number;
      placement: number | null;
      isWinner: boolean;
    }>
  >([]);

  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadDisputes = async () => {
    setLoading(true);
    try {
      // Retrieve dispute queue
      const data = await disputeApi.getUserDisputes();
      setDisputes(data || []);
    } catch (err: any) {
      console.error('Failed to load disputes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDisputes();
  }, []);

  const openResolutionModal = (
    dispute: DisputeItem,
    action: 'UPHOLD' | 'DISMISS' | 'INVESTIGATE'
  ) => {
    setSelectedDispute(dispute);
    setModalAction(action);

    if (action === 'UPHOLD') {
      setResolutionNotes('Dispute upheld following official review of reported match violation.');
      setUpholdType('FORFEIT_WALKOVER');

      // Pre-select claimant as winner by default in forfeit/walkover
      const claimantResult = dispute.match?.results?.find(
        (r) => r.participant?.user?.id === dispute.claimantId
      );
      if (claimantResult) {
        setForfeitWinnerId(claimantResult.participantId);
      } else if (dispute.match?.results && dispute.match.results.length > 0) {
        setForfeitWinnerId(dispute.match.results[0].participantId);
      }

      // Pre-select other participant for docking points
      const otherResult = dispute.match?.results?.find(
        (r) => r.participant?.user?.id !== dispute.claimantId
      );
      if (otherResult) {
        setDockedParticipantId(otherResult.participantId);
      }

      if (dispute.match?.results) {
        setScoreAdjustments(
          dispute.match.results.map((r) => ({
            participantId: r.participantId,
            competitorName:
              r.participant?.team?.name || r.participant?.user?.username || 'Competitor',
            score: r.score,
            kills: r.kills ?? 0,
            placement: r.placement ?? null,
            isWinner: r.isWinner
          }))
        );
      }
    } else if (action === 'DISMISS') {
      setResolutionNotes(
        'Insufficient evidence provided or the reported incident does not violate official tournament rulebook.'
      );
    } else {
      setResolutionNotes('Ticket is under active staff investigation.');
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDispute || !modalAction) return;
    if (!resolutionNotes.trim()) {
      alert('Please enter official adjudication explanation notes.');
      return;
    }

    setSubmitting(true);
    setFeedbackMsg(null);
    try {
      let overturnResult: any = undefined;

      if (modalAction === 'UPHOLD') {
        if (upholdType === 'FORFEIT_WALKOVER') {
          const forfeitOpponent = selectedDispute.match?.results?.find(
            (r) => r.participantId !== forfeitWinnerId
          )?.participantId;

          overturnResult = {
            type: 'FORFEIT_WALKOVER',
            winnerParticipantId: forfeitWinnerId,
            forfeitParticipantId: forfeitOpponent
          };
        } else if (upholdType === 'DOCK_POINTS') {
          overturnResult = {
            type: 'DOCK_POINTS',
            dockedParticipantId,
            pointsDeducted: Number(pointsDeducted)
          };
        } else if (upholdType === 'OVERWRITE_SCORES') {
          overturnResult = {
            type: 'OVERWRITE_SCORES',
            scoreAdjustments
          };
        }
      }

      const apiAction: 'INVESTIGATE' | 'ACCEPT_OVERWRITE' | 'DISMISS' =
        modalAction === 'UPHOLD'
          ? 'ACCEPT_OVERWRITE'
          : modalAction === 'DISMISS'
          ? 'DISMISS'
          : 'INVESTIGATE';

      await disputeApi.resolveDispute(selectedDispute.id, {
        action: apiAction,
        resolutionNotes: resolutionNotes.trim(),
        scoreAdjustments:
          upholdType === 'OVERWRITE_SCORES'
            ? scoreAdjustments.map((s) => ({
                participantId: s.participantId,
                score: s.score,
                kills: s.kills,
                placement: s.placement ?? undefined,
                isWinner: s.isWinner
              }))
            : undefined
      });

      setFeedbackMsg({
        type: 'success',
        text: `Dispute ticket #${selectedDispute.id.slice(0, 8)} successfully ${
          modalAction === 'UPHOLD' ? 'UPHELD' : modalAction === 'DISMISS' ? 'DISMISSED' : 'updated'
        }.`
      });

      setModalAction(null);
      setSelectedDispute(null);
      setResolutionNotes('');
      await loadDisputes();
      setTimeout(() => setFeedbackMsg(null), 5000);
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.response?.data?.error || err.message || 'Failed to update dispute.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getAccused = (dispute: DisputeItem) => {
    if (!dispute.match?.results) return null;
    const otherResult = dispute.match.results.find(
      (r) => r.participant?.user?.id !== dispute.claimantId
    );
    if (!otherResult) return null;
    return {
      id: otherResult.participantId,
      name:
        otherResult.participant?.team?.name ||
        otherResult.participant?.user?.username ||
        'Opponent Competitor'
    };
  };

  const filteredDisputes = disputes.filter((d) => {
    if (statusFilter !== 'ALL' && d.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    const accused = getAccused(d);
    return (
      d.tournament?.title.toLowerCase().includes(q) ||
      d.claimant.username.toLowerCase().includes(q) ||
      (accused && accused.name.toLowerCase().includes(q)) ||
      d.reason.toLowerCase().includes(q) ||
      d.description.toLowerCase().includes(q)
    );
  });

  const getReasonBadge = (reason: string) => {
    const r = reason.toUpperCase();
    if (r.includes('CHEAT')) {
      return 'bg-red-500/15 text-red-400 border-red-500/30';
    }
    if (r.includes('SCORE') || r.includes('WRONG')) {
      return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    }
    if (r.includes('TOXIC') || r.includes('RULE')) {
      return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
    }
    return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return (
          <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 rounded-full flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            <span>OPEN TICKET</span>
          </span>
        );
      case 'INVESTIGATING':
        return (
          <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded-full flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>UNDER INVESTIGATION</span>
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>UPHELD / RESOLVED</span>
          </span>
        );
      case 'DISMISSED':
        return (
          <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700 rounded-full flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            <span>DISMISSED</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn py-6 px-4 max-w-7xl mx-auto">
      {/* Top Banner Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-600 to-amber-500 flex items-center justify-center text-black font-bold shadow-glow-amber">
              <Gavel className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-white tracking-wide">
                  DISPUTE RESOLUTION HUB
                </h1>
                <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-full uppercase">
                  {role} ADJUDICATION
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Adjudicate contested match tickets, review player screenshot evidence, uphold disputes with walkovers or docked points, and issue disciplinary sanctions.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              to={role === 'ADMIN' ? '/admin' : '/organizer'}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
            >
              {role === 'ADMIN' ? 'Admin Overview' : 'Organizer Dashboard'}
            </Link>
            <button
              onClick={loadDisputes}
              disabled={loading}
              className="px-3.5 py-2 bg-cyan-400 hover:bg-cyan-300 text-black font-heading font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-glow-cyan transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Queue</span>
            </button>
          </div>
        </div>
      </div>

      {feedbackMsg && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center gap-2.5 border shadow-lg animate-fadeIn ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          {feedbackMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gaming-card border border-slate-800 p-4 rounded-2xl shadow-md">
        <div className="flex flex-wrap items-center gap-2">
          {['ALL', 'OPEN', 'INVESTIGATING', 'RESOLVED', 'DISMISSED'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-xs font-mono rounded-xl transition-all ${
                statusFilter === status
                  ? 'bg-cyan-400 text-black font-bold shadow-glow-cyan'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search claimant, accused, or reason..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>
      </div>

      {/* Disputes Dynamic List */}
      {loading ? (
        <div className="py-24 text-center space-y-3">
          <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-mono text-xs text-slate-400">Loading dispute tickets from match matrix...</p>
        </div>
      ) : filteredDisputes.length === 0 ? (
        <div className="gaming-card rounded-3xl border border-slate-800 p-14 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="font-heading font-bold text-lg text-white">No Dispute Tickets Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Matches are currently running cleanly with no contested results under this filter.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDisputes.map((dispute) => {
            const accused = getAccused(dispute);
            const isOpenOrInvestigating =
              dispute.status === 'OPEN' || dispute.status === 'INVESTIGATING';

            return (
              <div
                key={dispute.id}
                className="gaming-card rounded-2xl border border-slate-800 hover:border-slate-700 p-6 space-y-5 transition-all shadow-lg"
              >
                {/* Ticket Top Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                  <div className="flex items-center space-x-3">
                    <span
                      className={`px-3 py-1 text-xs font-mono font-bold rounded-lg border uppercase tracking-wider ${getReasonBadge(
                        dispute.reason
                      )}`}
                    >
                      {dispute.reason.replace(/_/g, ' ')}
                    </span>
                    <div>
                      <h3 className="text-base font-heading font-bold text-white flex items-center gap-2">
                        <span>{dispute.tournament?.title || 'Tournament'}</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-cyan-400">Match #{dispute.match.matchNumber}</span>
                        {dispute.match.round && (
                          <span className="text-xs font-mono text-slate-400">
                            ({dispute.match.round.name})
                          </span>
                        )}
                      </h3>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Ticket ID: {dispute.id.slice(0, 8)} • Reported{' '}
                        {new Date(dispute.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusBadge(dispute.status)}
                  </div>
                </div>

                {/* Parties Details: Complaining vs Accused */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800/60">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-xs">
                      CP
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block">
                        Complaining Player / Claimant
                      </span>
                      <span className="text-sm font-heading font-bold text-white">
                        {dispute.claimant.username}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 font-bold text-xs">
                        AC
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-rose-400 uppercase tracking-wider block">
                          Accused Competitor / Opponent
                        </span>
                        <span className="text-sm font-heading font-bold text-white">
                          {accused ? accused.name : 'Opponent in Match'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description & Evidence */}
                <div className="space-y-3">
                  <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed font-sans">
                    <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest block mb-1">
                      Claimant Description & Incident Notes:
                    </span>
                    "{dispute.description}"
                  </div>

                  {dispute.proofUrl && (
                    <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                      <span className="text-slate-400 font-mono text-[11px] flex items-center gap-1">
                        <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                        Evidence Link / Screenshot:
                      </span>
                      <a
                        href={dispute.proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:text-cyan-300 font-mono underline break-all font-semibold"
                      >
                        {dispute.proofUrl}
                      </a>
                    </div>
                  )}
                </div>

                {/* Official Resolution Notes Display (if resolved) */}
                {dispute.resolutionNotes && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span>Adjudicated by {dispute.resolvedBy?.username || 'Staff'}</span>
                      <span>
                        {dispute.resolvedAt ? new Date(dispute.resolvedAt).toLocaleString() : ''}
                      </span>
                    </div>
                    <p className="text-slate-200 italic font-mono">
                      "{dispute.resolutionNotes}"
                    </p>
                  </div>
                )}

                {/* Action Suite (When Open or Investigating) */}
                {isOpenOrInvestigating && (
                  <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
                    <button
                      onClick={() => openResolutionModal(dispute, 'INVESTIGATE')}
                      className="px-4 py-2 text-xs font-heading font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl transition-colors flex items-center gap-1.5"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Mark Investigating</span>
                    </button>

                    <button
                      onClick={() => openResolutionModal(dispute, 'DISMISS')}
                      className="px-4 py-2 text-xs font-heading font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5 text-slate-400" />
                      <span>Dismiss Dispute</span>
                    </button>

                    <button
                      onClick={() => openResolutionModal(dispute, 'UPHOLD')}
                      className="px-5 py-2 text-xs font-heading font-extrabold text-black bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 rounded-xl shadow-glow-emerald transition-all flex items-center gap-1.5"
                    >
                      <Gavel className="w-3.5 h-3.5" />
                      <span>Uphold Dispute</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Uphold / Dismiss Modal */}
      {modalAction && selectedDispute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl text-slate-100 overflow-hidden space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                    modalAction === 'UPHOLD'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {modalAction === 'UPHOLD' ? <Gavel className="w-5 h-5" /> : <X className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-heading font-bold text-lg text-white">
                    {modalAction === 'UPHOLD' ? 'Uphold Dispute & Apply Overturn' : 'Dismiss Dispute Ticket'}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Ticket #{selectedDispute.id.slice(0, 8)} • Match #{selectedDispute.match.matchNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalAction(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} className="space-y-4">
              {/* If Upholding, pick Overturn Action */}
              {modalAction === 'UPHOLD' && (
                <div className="space-y-3">
                  <label className="text-xs font-mono text-slate-300 block">
                    Choose Overturn Action:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setUpholdType('FORFEIT_WALKOVER')}
                      className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                        upholdType === 'FORFEIT_WALKOVER'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                          : 'bg-slate-800/60 border-slate-700 text-slate-400'
                      }`}
                    >
                      <Award className="w-4 h-4" />
                      <span className="text-xs">Award Forfeit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setUpholdType('DOCK_POINTS')}
                      className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                        upholdType === 'DOCK_POINTS'
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                          : 'bg-slate-800/60 border-slate-700 text-slate-400'
                      }`}
                    >
                      <MinusCircle className="w-4 h-4" />
                      <span className="text-xs">Dock Points</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setUpholdType('OVERWRITE_SCORES')}
                      className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                        upholdType === 'OVERWRITE_SCORES'
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold'
                          : 'bg-slate-800/60 border-slate-700 text-slate-400'
                      }`}
                    >
                      <Edit3 className="w-4 h-4" />
                      <span className="text-xs">Overwrite Score</span>
                    </button>
                  </div>

                  {/* Forfeit Options */}
                  {upholdType === 'FORFEIT_WALKOVER' && (
                    <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                      <span className="text-xs font-mono text-slate-300 block">
                        Designate Advancing Match Winner:
                      </span>
                      <select
                        value={forfeitWinnerId}
                        onChange={(e) => setForfeitWinnerId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:border-cyan-400"
                      >
                        {selectedDispute.match?.results?.map((r) => {
                          const name =
                            r.participant?.team?.name ||
                            r.participant?.user?.username ||
                            'Competitor';
                          return (
                            <option key={r.participantId} value={r.participantId}>
                              {name} {r.participant?.user?.id === selectedDispute.claimantId ? '(Claimant)' : '(Opponent)'}
                            </option>
                          );
                        })}
                      </select>
                      <p className="text-[11px] text-slate-400">
                        The chosen winner will be awarded 1-0 win, the opponent will be marked as forfeit/disqualified, and bracket will advance.
                      </p>
                    </div>
                  )}

                  {/* Dock Points Options */}
                  {upholdType === 'DOCK_POINTS' && (
                    <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-3">
                      <div className="space-y-1">
                        <span className="text-xs font-mono text-slate-300 block">
                          Target Competitor to Dock:
                        </span>
                        <select
                          value={dockedParticipantId}
                          onChange={(e) => setDockedParticipantId(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:border-cyan-400"
                        >
                          {selectedDispute.match?.results?.map((r) => {
                            const name =
                              r.participant?.team?.name ||
                              r.participant?.user?.username ||
                              'Competitor';
                            return (
                              <option key={r.participantId} value={r.participantId}>
                                {name} ({r.score} pts)
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <span className="text-xs font-mono text-slate-300 block">
                          Points Penalty to Deduct:
                        </span>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={pointsDeducted}
                          onChange={(e) => setPointsDeducted(Number(e.target.value))}
                          className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white font-mono"
                        />
                      </div>
                    </div>
                  )}

                  {/* Overwrite Scores Options */}
                  {upholdType === 'OVERWRITE_SCORES' && (
                    <div className="space-y-2 p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                      <span className="text-xs font-mono text-slate-300 block">
                        Correct Match Score Table:
                      </span>
                      {scoreAdjustments.map((adj, i) => (
                        <div
                          key={adj.participantId}
                          className="flex items-center justify-between gap-3 p-2 bg-slate-900 rounded-lg text-xs"
                        >
                          <span className="font-semibold text-white">{adj.competitorName}</span>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={adj.score}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setScoreAdjustments((prev) => {
                                  const c = [...prev];
                                  c[i].score = val;
                                  return c;
                                });
                              }}
                              className="w-16 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-center text-white font-mono"
                            />
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="radio"
                                name="overrideWinner"
                                checked={adj.isWinner}
                                onChange={() => {
                                  setScoreAdjustments((prev) =>
                                    prev.map((item, idx) => ({
                                      ...item,
                                      isWinner: idx === i
                                    }))
                                  );
                                }}
                              />
                              <span className="text-[10px] font-mono text-emerald-400">Winner</span>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Official Notes */}
              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-300 flex items-center gap-1">
                  <span>Official Decision Explanation (Sent to Player Notification)</span>
                  <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 resize-none font-mono text-xs"
                  required
                />
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalAction(null)}
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-5 py-2.5 rounded-xl font-heading font-bold text-xs uppercase tracking-wider text-black transition-all shadow-lg flex items-center gap-1.5 ${
                    modalAction === 'UPHOLD'
                      ? 'bg-emerald-400 hover:bg-emerald-300 shadow-glow-emerald'
                      : 'bg-rose-400 hover:bg-rose-300'
                  }`}
                >
                  <Gavel className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Applying Decision...' : 'Confirm & Send Decision'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

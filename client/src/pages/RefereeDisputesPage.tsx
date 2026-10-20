import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  ShieldAlert,
  Search,
  Filter,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  User,
  Users,
  Swords,
  Trophy,
  ArrowRight,
  Send,
  Flag,
  FileText,
  MinusCircle
} from 'lucide-react';
import { RefereeAPI } from '../api/referee.service';
import { useToast } from '../context/ToastContext';
import { DisciplinaryActionModal } from '../components/DisciplinaryActionModal';

export const RefereeDisputesPage: React.FC = () => {
  const toast = useToast();
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Resolution Modal / Action State
  const [activeActionDispute, setActiveActionDispute] = useState<any | null>(null);
  const [actionType, setActionType] = useState<'UPHOLD' | 'DISMISS'>('UPHOLD');
  const [actionTaken, setActionTaken] = useState<'UPHELD' | 'FORFEIT_AWARDED' | 'POINTS_DOCKED'>('UPHELD');
  const [resolutionNote, setResolutionNote] = useState('');
  const [forfeitWinnerId, setForfeitWinnerId] = useState('');
  const [dockedParticipantId, setDockedParticipantId] = useState('');
  const [dockPoints, setDockPoints] = useState(5);
  const [submittingAction, setSubmittingAction] = useState(false);

  // Sanction Modal State
  const [sanctionModalOpen, setSanctionModalOpen] = useState(false);
  const [sanctionTarget, setSanctionTarget] = useState<any>(null);

  const loadDisputes = async () => {
    try {
      setLoading(true);
      const res = await RefereeAPI.getRefereeDisputes(
        selectedStatus !== 'ALL' ? selectedStatus : undefined
      );
      if (res.success) {
        setDisputes(res.disputes || []);
      }
    } catch (err: any) {
      toast.error('Failed to load disputes', err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDisputes();
  }, [selectedStatus]);

  const openResolutionDialog = (dispute: any, type: 'UPHOLD' | 'DISMISS') => {
    setActiveActionDispute(dispute);
    setActionType(type);
    setActionTaken(type === 'UPHOLD' ? 'UPHELD' : 'DISMISSED' as any);
    setResolutionNote('');

    // Pre-populate forfeit winner as complaining player
    if (dispute.complaining?.participantId) {
      setForfeitWinnerId(dispute.complaining.participantId);
    }

    // Pre-populate docked participant as accused player
    if (dispute.accused?.participantId) {
      setDockedParticipantId(dispute.accused.participantId);
    }
  };

  const handleCommitResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeActionDispute) return;
    if (!resolutionNote.trim()) {
      toast.warning('Mandatory Note', 'Please provide an official explanation for the player.');
      return;
    }

    try {
      setSubmittingAction(true);
      const res = await RefereeAPI.resolveRefereeDispute(activeActionDispute.id, {
        action: actionType,
        actionTaken: actionType === 'UPHOLD' ? actionTaken : 'DISMISSED',
        resolutionNote: resolutionNote.trim(),
        forfeitWinnerParticipantId:
          actionType === 'UPHOLD' && actionTaken === 'FORFEIT_AWARDED' ? forfeitWinnerId : undefined,
        dockedParticipantId:
          actionType === 'UPHOLD' && actionTaken === 'POINTS_DOCKED' ? dockedParticipantId : undefined,
        dockPoints:
          actionType === 'UPHOLD' && actionTaken === 'POINTS_DOCKED' ? dockPoints : undefined
      });

      if (res.success) {
        toast.success(
          actionType === 'UPHOLD' ? 'Dispute Upheld' : 'Dispute Dismissed',
          `Ticket #${activeActionDispute.id.slice(0, 8)} successfully resolved.`
        );
        setActiveActionDispute(null);
        loadDisputes();
      }
    } catch (err: any) {
      toast.error('Resolution Failed', err.response?.data?.error || err.message);
    } finally {
      setSubmittingAction(false);
    }
  };

  const openSanctionModal = (dispute: any) => {
    setSanctionTarget({
      participantId: dispute.accused?.participantId,
      userId: dispute.accused?.id,
      username: dispute.accused?.username || 'Accused Competitor',
      teamName: dispute.accused?.team,
      tournamentId: dispute.tournamentId,
      matchId: dispute.matchId
    });
    setSanctionModalOpen(true);
  };

  const filteredDisputes = disputes.filter((d) => {
    const q = searchQuery.toLowerCase();
    const tournamentStr = d.tournamentTitle?.toLowerCase() || '';
    const descStr = d.description?.toLowerCase() || '';
    const complainingStr = d.complaining?.username?.toLowerCase() || '';
    const accusedStr = d.accused?.username?.toLowerCase() || '';
    const catStr = d.incidentCategory?.toLowerCase() || '';
    return (
      tournamentStr.includes(q) ||
      descStr.includes(q) ||
      complainingStr.includes(q) ||
      accusedStr.includes(q) ||
      catStr.includes(q)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3 mr-1" /> Open
          </span>
        );
      case 'INVESTIGATING':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <ShieldAlert className="w-3 h-3 mr-1" /> Investigating
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle className="w-3 h-3 mr-1" /> Resolved (Upheld)
          </span>
        );
      case 'DISMISSED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-neutral-700/60 text-neutral-400 border border-neutral-600">
            <XCircle className="w-3 h-3 mr-1" /> Dismissed
          </span>
        );
      default:
        return <span className="text-xs text-neutral-400">{status}</span>;
    }
  };

  const getCategoryBadge = (cat: string) => {
    const map: Record<string, { label: string; color: string }> = {
      CHEATING: { label: 'Cheating / Exploits', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
      INCORRECT_SCORE: { label: 'Wrong Score / Frags', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
      RULE_VIOLATION: { label: 'Rule Violation', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
      TOXIC_CONDUCT: { label: 'Toxic Conduct', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' }
    };
    const c = map[cat] || { label: cat || 'Incident', color: 'bg-neutral-800 text-neutral-300 border-neutral-700' };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${c.color}`}>
        {c.label}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold tracking-wider uppercase text-primary-400 bg-primary-500/10 px-2.5 py-0.5 rounded-md border border-primary-500/20">
              Referee Adjudication Center
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mt-1 flex items-center gap-3">
            <span>Dispute Resolution Queue</span>
            <span className="text-sm font-semibold bg-neutral-800 text-neutral-300 px-3 py-1 rounded-full border border-neutral-700">
              {filteredDisputes.length} Tickets
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Review player disputes, review submitted stream proof, uphold complaints with walkovers or dock points, and dismiss unwarranted claims.
          </p>
        </div>

        <Link
          to="/referee/dashboard"
          className="inline-flex items-center px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-200 transition"
        >
          Referee Dashboard
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-surface border border-neutral-800 shadow-lg">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tickets, players, tournaments..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-primary-500 transition"
          />
        </div>

        {/* Status Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['ALL', 'OPEN', 'INVESTIGATING', 'RESOLVED', 'DISMISSED'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                selectedStatus === st
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
                  : 'bg-neutral-800/60 text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-neutral-400">Loading Active Referee Dispute Queue...</p>
        </div>
      ) : filteredDisputes.length === 0 ? (
        <div className="text-center py-16 px-4 bg-surface border border-neutral-800 rounded-2xl">
          <ShieldAlert className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">No Disputes Found</h3>
          <p className="text-xs text-neutral-400 max-w-md mx-auto">
            {selectedStatus === 'ALL'
              ? 'There are currently no disputes filed for matches assigned to you.'
              : `No disputes found under status "${selectedStatus}".`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDisputes.map((d) => {
            const isExpanded = expandedId === d.id;

            return (
              <div
                key={d.id}
                className="bg-surface border border-neutral-800 rounded-2xl overflow-hidden shadow-lg transition hover:border-neutral-700"
              >
                {/* Main Card Header */}
                <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {getStatusBadge(d.status)}
                      {getCategoryBadge(d.incidentCategory)}
                      <span className="text-xs text-neutral-400">
                        Tournament: <strong className="text-neutral-200">{d.tournamentTitle}</strong>
                      </span>
                      {d.matchNumber && (
                        <span className="text-xs text-neutral-400">
                          • Match <strong className="text-neutral-200">#{d.matchNumber}</strong> ({d.roundName || 'Round 1'})
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      {/* Complaining Player */}
                      <div className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-800/80">
                        <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold text-xs">
                          C
                        </div>
                        <div>
                          <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">
                            Complaining Party
                          </div>
                          <div className="text-xs font-bold text-white">
                            {d.complaining?.username}
                            {d.complaining?.team && (
                              <span className="text-primary-400 ml-1.5 font-normal">
                                ({d.complaining.team})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Accused Player */}
                      <div className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-800/80">
                        <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center font-bold text-xs">
                          A
                        </div>
                        <div>
                          <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">
                            Accused Competitor
                          </div>
                          <div className="text-xs font-bold text-white">
                            {d.accused?.username || 'Opponent Team'}
                            {d.accused?.team && (
                              <span className="text-rose-400 ml-1.5 font-normal">
                                ({d.accused.team})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Description preview */}
                    <p className="text-xs text-neutral-300 leading-relaxed pt-1">
                      <strong className="text-neutral-400 font-medium">Issue: </strong>
                      {d.description}
                    </p>
                  </div>

                  {/* Actions & Decision buttons */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-end gap-2.5 min-w-[200px]">
                    {d.status === 'OPEN' || d.status === 'INVESTIGATING' ? (
                      <div className="flex items-center space-x-2 w-full">
                        <button
                          type="button"
                          onClick={() => openResolutionDialog(d, 'UPHOLD')}
                          className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md shadow-emerald-600/20 text-center"
                        >
                          Uphold Dispute
                        </button>
                        <button
                          type="button"
                          onClick={() => openResolutionDialog(d, 'DISMISS')}
                          className="flex-1 py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-bold border border-neutral-700 transition text-center"
                        >
                          Dismiss
                        </button>
                      </div>
                    ) : (
                      <div className="text-right text-xs">
                        <div className="font-bold text-white">
                          Action: {d.actionTaken || d.status}
                        </div>
                        {d.resolvedBy && (
                          <div className="text-neutral-400 text-[11px]">
                            By Ref @{d.resolvedBy}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center space-x-2 w-full">
                      {d.matchId && (
                        <Link
                          to={`/referee/matches/${d.matchId}`}
                          className="flex-1 text-center py-1.5 px-2.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 text-[11px] font-semibold border border-neutral-700/80 transition"
                        >
                          Match Room
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => openSanctionModal(d)}
                        className="py-1.5 px-2.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[11px] font-semibold border border-rose-500/20 transition flex items-center justify-center"
                      >
                        <Flag className="w-3 h-3 mr-1" />
                        Sanction
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : d.id)}
                        className="p-1.5 rounded-lg bg-neutral-800 text-neutral-400 hover:text-white"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Details Drawer */}
                {isExpanded && (
                  <div className="px-6 py-4 border-t border-neutral-800/80 bg-neutral-900/40 text-xs space-y-4 animate-fadeIn">
                    {/* Proof Links */}
                    {d.proofUrl ? (
                      <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-neutral-300">
                          <ExternalLink className="w-4 h-4 text-primary-400" />
                          <span>Submitted Evidence Link / Stream Clip:</span>
                        </div>
                        <a
                          href={d.proofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-primary-400 hover:underline flex items-center space-x-1"
                        >
                          <span>{d.proofUrl.length > 50 ? `${d.proofUrl.slice(0, 50)}...` : d.proofUrl}</span>
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      </div>
                    ) : (
                      <p className="text-neutral-500 italic">No external proof URL attached.</p>
                    )}

                    {/* Resolution Note if resolved */}
                    {d.resolutionNote && (
                      <div className="p-3.5 rounded-xl bg-primary-950/20 border border-primary-500/20 space-y-1">
                        <div className="font-bold text-primary-300 flex items-center">
                          <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                          Official Referee Resolution Note:
                        </div>
                        <p className="text-neutral-300 leading-relaxed font-mono text-[11px]">
                          {d.resolutionNote}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Action Suite Dialog: Uphold or Dismiss Dispute */}
      {activeActionDispute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-surface border border-neutral-700 rounded-2xl shadow-2xl overflow-hidden animate-scaleUp">
            <div className="px-6 py-5 border-b border-neutral-800 bg-neutral-900/60 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  {actionType === 'UPHOLD' ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                      <span>Uphold Player Dispute</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-neutral-400" />
                      <span>Dismiss Dispute Ticket</span>
                    </>
                  )}
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Ticket #{activeActionDispute.id.slice(0, 8)} • {activeActionDispute.tournamentTitle}
                </p>
              </div>
              <button
                onClick={() => setActiveActionDispute(null)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCommitResolution} className="p-6 space-y-5">
              {actionType === 'UPHOLD' && (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                    Remedy & Action Suite
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setActionTaken('UPHELD')}
                      className={`p-2.5 rounded-xl border text-center transition ${
                        actionTaken === 'UPHELD'
                          ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 font-bold'
                          : 'bg-neutral-800/60 border-neutral-700 text-neutral-400'
                      }`}
                    >
                      <CheckCircle className="w-4 h-4 mx-auto mb-1 text-emerald-400" />
                      <span className="text-xs block">Confirm Uphold</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActionTaken('FORFEIT_AWARDED')}
                      className={`p-2.5 rounded-xl border text-center transition ${
                        actionTaken === 'FORFEIT_AWARDED'
                          ? 'bg-primary-500/15 border-primary-500 text-primary-300 font-bold'
                          : 'bg-neutral-800/60 border-neutral-700 text-neutral-400'
                      }`}
                    >
                      <Trophy className="w-4 h-4 mx-auto mb-1 text-primary-400" />
                      <span className="text-xs block">Award Forfeit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActionTaken('POINTS_DOCKED')}
                      className={`p-2.5 rounded-xl border text-center transition ${
                        actionTaken === 'POINTS_DOCKED'
                          ? 'bg-rose-500/15 border-rose-500 text-rose-300 font-bold'
                          : 'bg-neutral-800/60 border-neutral-700 text-neutral-400'
                      }`}
                    >
                      <MinusCircle className="w-4 h-4 mx-auto mb-1 text-rose-400" />
                      <span className="text-xs block">Dock Points</span>
                    </button>
                  </div>

                  {actionTaken === 'FORFEIT_AWARDED' && (
                    <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl space-y-1 text-xs">
                      <span className="font-semibold text-white">Awarding Walkover / Win to:</span>
                      <p className="text-emerald-400 font-bold">
                        {activeActionDispute.complaining?.username} ({activeActionDispute.complaining?.team || 'Competitor'})
                      </p>
                      <p className="text-neutral-400 text-[11px]">
                        The match result will immediately overturn in favor of the complaining party.
                      </p>
                    </div>
                  )}

                  {actionTaken === 'POINTS_DOCKED' && (
                    <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">Points to dock from accused:</span>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={dockPoints}
                          onChange={(e) => setDockPoints(Number(e.target.value))}
                          className="w-20 px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-right text-xs text-white"
                        />
                      </div>
                      <p className="text-neutral-400 text-[11px]">
                        Docks points directly from {activeActionDispute.accused?.username}'s match score.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Resolution Note */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                  Official Referee Explanation *
                </label>
                <textarea
                  required
                  rows={4}
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder={
                    actionType === 'UPHOLD'
                      ? 'Confirm findings, rule violation verified, and explain remedy...'
                      : 'Provide factual reasons for dismissing this claim (e.g., stream review shows legitimate kill, no rule broken)...'
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-primary-500 transition resize-none"
                />
                <p className="text-[11px] text-neutral-400">
                  This explanation will be delivered directly to the complaining player via notifications.
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveActionDispute(null)}
                  disabled={submittingAction}
                  className="px-4 py-2 rounded-xl border border-neutral-700 text-neutral-300 hover:bg-neutral-800 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className={`flex items-center px-5 py-2 rounded-xl text-xs font-bold text-white shadow-lg transition disabled:opacity-50 ${
                    actionType === 'UPHOLD'
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                      : 'bg-neutral-700 hover:bg-neutral-600'
                  }`}
                >
                  {submittingAction ? (
                    <span>Committing...</span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                      <span>{actionType === 'UPHOLD' ? 'Execute Decision' : 'Dismiss Ticket'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Disciplinary Sanction Modal */}
      <DisciplinaryActionModal
        isOpen={sanctionModalOpen}
        onClose={() => setSanctionModalOpen(false)}
        target={sanctionTarget}
        onSuccess={loadDisputes}
      />
    </div>
  );
};

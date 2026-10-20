import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle,
  Edit3,
  ArrowLeft,
  AlertTriangle,
  Trophy,
  Swords,
  Calendar,
  Clock,
  Layers,
  Save,
  RotateCcw,
  User,
  Users,
  Flag,
  FileText
} from 'lucide-react';
import { RefereeAPI } from '../api/referee.service';
import { useToast } from '../context/ToastContext';
import { DisciplinaryActionModal } from '../components/DisciplinaryActionModal';

interface MatchResultRow {
  participantId: string;
  username: string;
  inGameName?: string;
  teamName?: string;
  teamTag?: string;
  score: number;
  kills: number;
  placement?: number;
  isWinner: boolean;
}

export const ScoreVerificationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [match, setMatch] = useState<any>(null);

  // Original submitted scorecard for comparison
  const [originalScores, setOriginalScores] = useState<MatchResultRow[]>([]);
  // Edited scorecard in case of override
  const [editedScores, setEditedScores] = useState<MatchResultRow[]>([]);

  const [isOverrideMode, setIsOverrideMode] = useState(false);
  const [refereeNote, setRefereeNote] = useState('');

  // Sanction Modal State
  const [sanctionModalOpen, setSanctionModalOpen] = useState(false);
  const [sanctionTarget, setSanctionTarget] = useState<any>(null);

  const loadMatchDetails = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await RefereeAPI.getMatchControlRoom(id);
      if (res.success && res.match) {
        setMatch(res.match);

        const rows: MatchResultRow[] = (res.match.results || []).map((r: any) => ({
          participantId: r.participant?.id || r.participantId,
          username: r.participant?.user?.username || 'Player',
          inGameName: r.participant?.inGameName || r.participant?.user?.username,
          teamName: r.participant?.team?.name,
          teamTag: r.participant?.team?.tag,
          score: r.score ?? 0,
          kills: r.kills ?? 0,
          placement: r.placement ?? 1,
          isWinner: r.isWinner ?? false
        }));

        setOriginalScores(rows);
        setEditedScores(JSON.parse(JSON.stringify(rows)));

        if (res.match.refereeNote) {
          setRefereeNote(res.match.refereeNote);
        }
      }
    } catch (err: any) {
      toast.error('Failed to load match', err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatchDetails();
  }, [id]);

  const handleScoreChange = (participantId: string, field: 'score' | 'kills' | 'placement', value: number) => {
    setEditedScores((prev) =>
      prev.map((row) => (row.participantId === participantId ? { ...row, [field]: value } : row))
    );
  };

  const handleWinnerToggle = (participantId: string) => {
    setEditedScores((prev) =>
      prev.map((row) => ({
        ...row,
        isWinner: row.participantId === participantId
      }))
    );
  };

  // 1. Approve & Finalize
  const handleApproveFinalize = async () => {
    if (!refereeNote.trim()) {
      toast.warning('Mandatory Note', 'Please provide a verification note for the audit log.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await RefereeAPI.verifyScorecardWithOverride(id!, {
        action: 'APPROVE',
        refereeNote: refereeNote.trim()
      });

      if (res.success) {
        toast.success('Scorecard Approved', 'Match officially verified & bracket advancement triggered.');
        loadMatchDetails();
      }
    } catch (err: any) {
      toast.error('Approval Failed', err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Edit & Override
  const handleSaveOverride = async () => {
    if (!refereeNote.trim()) {
      toast.warning('Mandatory Note', 'Please explain why scores or kills were modified in the referee note.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await RefereeAPI.verifyScorecardWithOverride(id!, {
        action: 'OVERRIDE',
        refereeNote: refereeNote.trim(),
        results: editedScores.map((row) => ({
          participantId: row.participantId,
          score: Number(row.score),
          kills: Number(row.kills),
          placement: Number(row.placement || 1),
          isWinner: Boolean(row.isWinner)
        }))
      });

      if (res.success) {
        toast.success('Scores Overridden & Approved', 'Score adjustments officially recorded.');
        setIsOverrideMode(false);
        loadMatchDetails();
      }
    } catch (err: any) {
      toast.error('Override Failed', err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openSanctionModal = (row: MatchResultRow) => {
    setSanctionTarget({
      participantId: row.participantId,
      username: row.username,
      teamName: row.teamName,
      tournamentId: match?.tournamentId,
      matchId: match?.id
    });
    setSanctionModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-neutral-400">Loading Official Match Scorecard...</p>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Match Not Found</h2>
        <p className="text-neutral-400 mb-6">Unable to locate the specified match record.</p>
        <Link
          to="/referee/dashboard"
          className="inline-flex items-center px-4 py-2 rounded-xl bg-neutral-800 text-white hover:bg-neutral-700 transition"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Referee Dashboard
        </Link>
      </div>
    );
  }

  const isSolo = match.tournament?.format === 'SOLO';

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-8 animate-fadeIn">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to={`/referee/matches/${match.id}`}
          className="inline-flex items-center text-xs text-neutral-400 hover:text-white transition group"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5 group-hover:-translate-x-1 transition-transform" />
          Return to Match Control Room
        </Link>
        <div className="flex items-center space-x-2">
          {match.isVerified ? (
            <span className="flex items-center text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
              Officially Verified
            </span>
          ) : (
            <span className="flex items-center text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
              <Clock className="w-3.5 h-3.5 mr-1.5" />
              Pending Referee Sign-off
            </span>
          )}
        </div>
      </div>

      {/* Match Header Hero Card */}
      <div className="relative overflow-hidden bg-surface border border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl -z-10" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold tracking-widest uppercase text-primary-400 bg-primary-500/10 px-2.5 py-0.5 rounded-md border border-primary-500/20">
                Score Verification Engine
              </span>
              <span className="text-xs text-neutral-400">
                {match.tournament?.title}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <span>Match #{match.matchNumber} Official Review</span>
              <span className="text-sm font-semibold text-neutral-400 bg-neutral-800/80 px-2.5 py-1 rounded-lg">
                {match.round?.name || `Round ${match.round?.roundNumber || 1}`}
              </span>
            </h1>
            <p className="text-xs text-neutral-400 flex items-center space-x-4 pt-1">
              <span className="flex items-center">
                <Swords className="w-3.5 h-3.5 mr-1 text-primary-400" />
                Format: <strong className="ml-1 text-neutral-200">{match.tournament?.format}</strong>
              </span>
              <span className="flex items-center">
                <Layers className="w-3.5 h-3.5 mr-1 text-primary-400" />
                Structure: <strong className="ml-1 text-neutral-200">{match.tournament?.structure || 'KNOCKOUT'}</strong>
              </span>
            </p>
          </div>

          {/* Quick Override Toggle */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsOverrideMode(!isOverrideMode)}
              className={`flex items-center px-4 py-2.5 rounded-xl border text-xs font-bold transition shadow-md ${
                isOverrideMode
                  ? 'bg-amber-500 text-black border-amber-400 shadow-amber-500/20'
                  : 'bg-neutral-800/80 border-neutral-700 text-neutral-300 hover:text-white hover:border-neutral-600'
              }`}
            >
              <Edit3 className="w-4 h-4 mr-2" />
              {isOverrideMode ? 'Editing Mode Active' : 'Edit & Override Mode'}
            </button>
          </div>
        </div>
      </div>

      {/* Comparison View Table */}
      <div className="bg-surface border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-neutral-800 bg-neutral-900/50 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
              <Trophy className="w-4 h-4 mr-2 text-primary-400" />
              Scorecard Comparison & Audit Table
            </h3>
            <p className="text-xs text-neutral-400">
              {isOverrideMode
                ? 'Adjust points, kills, or declare match winner below before saving.'
                : 'Comparing submitted organizer scores against verified results.'}
            </p>
          </div>
          {isOverrideMode && (
            <button
              onClick={() => setEditedScores(JSON.parse(JSON.stringify(originalScores)))}
              className="flex items-center text-xs text-neutral-400 hover:text-white px-2 py-1 rounded bg-neutral-800"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Reset Changes
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-900/80 text-neutral-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Participant / Team</th>
                <th className="py-3 px-4">Submitted Score</th>
                {isOverrideMode && <th className="py-3 px-4 text-amber-400">Adjusted Score</th>}
                <th className="py-3 px-4">Kills / Frags</th>
                {isOverrideMode && <th className="py-3 px-4 text-amber-400">Adjusted Kills</th>}
                <th className="py-3 px-4">Placement Rank</th>
                <th className="py-3 px-4 text-center">Winner Status</th>
                <th className="py-3 px-4 text-right">Sanctions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 font-medium">
              {editedScores.map((row, idx) => {
                const orig = originalScores.find((o) => o.participantId === row.participantId) || row;
                const scoreDiff = row.score !== orig.score;
                const killsDiff = row.kills !== orig.kills;

                return (
                  <tr
                    key={row.participantId}
                    className={`hover:bg-neutral-800/30 transition ${
                      row.isWinner ? 'bg-primary-950/20' : ''
                    }`}
                  >
                    {/* Participant / Team */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-lg bg-neutral-800 flex items-center justify-center font-bold text-neutral-300">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="font-bold text-white flex items-center space-x-1.5">
                            <span>{row.username}</span>
                            {row.isWinner && (
                              <Trophy className="w-3.5 h-3.5 text-amber-400" />
                            )}
                          </div>
                          {!isSolo && row.teamName && (
                            <span className="text-[11px] text-primary-400 font-semibold">
                              {row.teamName} {row.teamTag && `[${row.teamTag}]`}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Submitted Score */}
                    <td className="py-3.5 px-4 font-mono font-bold text-neutral-300">
                      {orig.score} pts
                    </td>

                    {/* Adjusted Score (if override mode) */}
                    {isOverrideMode && (
                      <td className="py-3.5 px-4">
                        <input
                          type="number"
                          min={0}
                          value={row.score}
                          onChange={(e) =>
                            handleScoreChange(row.participantId, 'score', Number(e.target.value))
                          }
                          className={`w-20 px-2.5 py-1.5 rounded-lg bg-neutral-900 border text-xs font-mono font-bold text-white focus:outline-none ${
                            scoreDiff
                              ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                              : 'border-neutral-700'
                          }`}
                        />
                      </td>
                    )}

                    {/* Submitted Kills */}
                    <td className="py-3.5 px-4 font-mono text-neutral-300">
                      {orig.kills}
                    </td>

                    {/* Adjusted Kills (if override mode) */}
                    {isOverrideMode && (
                      <td className="py-3.5 px-4">
                        <input
                          type="number"
                          min={0}
                          value={row.kills}
                          onChange={(e) =>
                            handleScoreChange(row.participantId, 'kills', Number(e.target.value))
                          }
                          className={`w-16 px-2.5 py-1.5 rounded-lg bg-neutral-900 border text-xs font-mono font-bold text-white focus:outline-none ${
                            killsDiff
                              ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                              : 'border-neutral-700'
                          }`}
                        />
                      </td>
                    )}

                    {/* Placement Rank */}
                    <td className="py-3.5 px-4">
                      {isOverrideMode ? (
                        <input
                          type="number"
                          min={1}
                          value={row.placement || 1}
                          onChange={(e) =>
                            handleScoreChange(row.participantId, 'placement', Number(e.target.value))
                          }
                          className="w-16 px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-xs font-mono text-white focus:outline-none"
                        />
                      ) : (
                        <span className="font-mono text-neutral-400">#{orig.placement || idx + 1}</span>
                      )}
                    </td>

                    {/* Winner Status Toggle */}
                    <td className="py-3.5 px-4 text-center">
                      {isOverrideMode ? (
                        <button
                          type="button"
                          onClick={() => handleWinnerToggle(row.participantId)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                            row.isWinner
                              ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                              : 'bg-neutral-800 text-neutral-400 hover:text-white'
                          }`}
                        >
                          {row.isWinner ? 'Declared Winner' : 'Mark Winner'}
                        </button>
                      ) : (
                        row.isWinner && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Winner
                          </span>
                        )
                      )}
                    </td>

                    {/* Flag / Sanction Button */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => openSanctionModal(row)}
                        className="inline-flex items-center px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white transition text-xs font-medium"
                      >
                        <Flag className="w-3 h-3 mr-1" />
                        Sanction
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mandatory Referee Sign-off Note */}
      <div className="bg-surface border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xl">
        <div className="flex items-center space-x-2">
          <FileText className="w-5 h-5 text-primary-400" />
          <h3 className="text-base font-bold text-white">
            Official Referee Review Notes *
          </h3>
        </div>
        <p className="text-xs text-neutral-400 leading-relaxed">
          State observations, video review timestamps, reasons for score adjustments, or affirm
          compliance with tournament rulebook clauses. This note is appended permanently to the
          official audit trail.
        </p>
        <textarea
          required
          rows={3}
          value={refereeNote}
          onChange={(e) => setRefereeNote(e.target.value)}
          placeholder="e.g., Reviewed match recording; verified 9 kills and placement order. Bracket ready for advance."
          className="w-full px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-700 text-white text-xs sm:text-sm placeholder-neutral-500 focus:outline-none focus:border-primary-500 transition resize-none"
        />

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-neutral-800">
          <div className="text-xs text-neutral-500">
            Verifier ID: <span className="font-mono text-neutral-300">{match.referee?.username || 'You'}</span>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            {isOverrideMode ? (
              <button
                type="button"
                disabled={submitting}
                onClick={handleSaveOverride}
                className="flex-1 sm:flex-initial flex items-center justify-center px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
              >
                <Save className="w-4 h-4 mr-2" />
                {submitting ? 'Committing Overrides...' : 'Commit & Finalize Override'}
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={handleApproveFinalize}
                className="flex-1 sm:flex-initial flex items-center justify-center px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-extrabold text-xs shadow-lg shadow-primary-600/20 transition disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4 mr-2" />
                {submitting ? 'Finalizing Match...' : 'Approve & Finalize Scorecard'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Disciplinary Sanction Modal */}
      <DisciplinaryActionModal
        isOpen={sanctionModalOpen}
        onClose={() => setSanctionModalOpen(false)}
        target={sanctionTarget}
        onSuccess={loadMatchDetails}
      />
    </div>
  );
};

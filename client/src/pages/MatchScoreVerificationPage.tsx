import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Trophy,
  Gamepad2,
  Users,
  Edit3,
  Save,
  Clock,
  RotateCcw,
  ShieldAlert,
  Calendar,
  ExternalLink
} from 'lucide-react';
import { refereeApi, RefereeMatch } from '../services/referee.service';
import { SanctionModal } from '../components/SanctionModal';
import { useAuth } from '../context/AuthContext';

export const MatchScoreVerificationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [match, setMatch] = useState<RefereeMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verification state
  const [isOverrideMode, setIsOverrideMode] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Editable scores state
  const [editableScores, setEditableScores] = useState<
    Array<{
      participantId: string;
      competitorName: string;
      score: number;
      kills: number;
      placement: number | null;
      isWinner: boolean;
    }>
  >([]);

  // Sanction Modal state
  const [sanctionTarget, setSanctionTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const loadMatch = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await refereeApi.getMatchById(id);
      setMatch(data);

      if (data.results && data.results.length > 0) {
        setEditableScores(
          data.results.map((r) => ({
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
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load match scorecard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatch();
  }, [id]);

  // Handle Score Input Changes in Override Mode
  const handleScoreChange = (
    index: number,
    field: 'score' | 'kills' | 'placement' | 'isWinner',
    val: any
  ) => {
    setEditableScores((prev) => {
      const updated = [...prev];
      if (field === 'isWinner' && val === true) {
        // If single winner selected, unset other winners if 1v1
        updated.forEach((s, i) => {
          s.isWinner = i === index;
        });
      } else {
        (updated[index] as any)[field] = val;
      }
      return updated;
    });
  };

  // 'Approve & Finalize' Handler
  const handleApproveFinalize = async () => {
    if (!id) return;
    const confirmApprove = window.confirm(
      'Approve & Finalize: This will officially sign off on this match scorecard and trigger bracket advancement. Proceed?'
    );
    if (!confirmApprove) return;

    setSubmitting(true);
    setError(null);
    try {
      await refereeApi.verifyMatchScore(id, {
        notes: verificationNotes.trim() || 'Scorecard officially approved without alterations.',
        override: false
      });
      setSuccessMsg('Match scorecard officially approved and bracket advanced!');
      await loadMatch();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Verification failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // 'Edit & Override' Submit Handler
  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    if (!verificationNotes.trim()) {
      setError('Referee notes are mandatory when editing or overriding match scores.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await refereeApi.verifyMatchScore(id, {
        notes: verificationNotes.trim(),
        override: true,
        scores: editableScores.map((s) => ({
          participantId: s.participantId,
          score: Number(s.score),
          kills: Number(s.kills),
          placement: s.placement ? Number(s.placement) : null,
          isWinner: s.isWinner
        }))
      });
      setSuccessMsg('Scorecard corrected, officially verified, and bracket progressed!');
      setIsOverrideMode(false);
      await loadMatch();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to submit score override.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-4">
        <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="font-mono text-xs text-slate-400">Loading match verification scorecard...</p>
      </div>
    );
  }

  if (error && !match) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center space-y-4">
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
        <Link
          to="/referee/portal"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Referee Dashboard</span>
        </Link>
      </div>
    );
  }

  if (!match) return null;

  return (
    <div className="space-y-8 py-8 px-4 max-w-7xl mx-auto animate-fadeIn">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            to="/referee/portal"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
              <span>{match.tournament.title}</span>
              <span>•</span>
              <span className="text-cyan-400">Match #{match.matchNumber}</span>
              <span>•</span>
              <span>Round {match.round.roundNumber} ({match.round.name})</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-white flex items-center gap-2 mt-0.5">
              <ShieldCheck className="w-7 h-7 text-cyan-400" />
              <span>Score Verification & Official Sign-off</span>
            </h1>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex items-center space-x-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-mono font-bold border uppercase tracking-wider ${
              match.isVerified
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
            }`}
          >
            {match.isVerified ? 'Officially Verified' : 'Pending Referee Sign-off'}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-mono bg-slate-800 text-slate-300 border border-slate-700 uppercase">
            {match.status}
          </span>
        </div>
      </div>

      {/* Success / Error Alerts */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-2 shadow-lg animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2 shadow-lg animate-fadeIn">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Official Sign-off Stamp banner if already verified */}
      {match.isVerified && (
        <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-heading font-bold text-white text-sm">
                Scorecard Certified & Sealed
              </h4>
              <p className="text-xs text-slate-300">
                Verified by <span className="text-cyan-400 font-semibold">{match.verifiedBy?.username || 'Referee'}</span> on{' '}
                {match.verifiedAt ? new Date(match.verifiedAt).toLocaleString() : 'Recent'}
              </p>
              {match.verificationNotes && (
                <p className="text-xs text-slate-400 italic mt-0.5 font-mono">
                  "{match.verificationNotes}"
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setIsOverrideMode(!isOverrideMode)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-heading font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isOverrideMode ? 'Cancel Edit' : 'Edit & Override'}</span>
          </button>
        </div>
      )}

      {/* Review Scorecard: Comparison View */}
      <div className="gaming-card rounded-3xl p-6 sm:p-8 border border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <h2 className="text-lg font-heading font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-cyan-400" />
              <span>Review Scorecard & Match Statistics</span>
            </h2>
            <p className="text-xs text-slate-400">
              Audit reported points, frags/kills, and placement standing before committing bracket results.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {!isOverrideMode && (
              <button
                type="button"
                onClick={() => setIsOverrideMode(true)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 text-xs font-heading font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit & Override Scores</span>
              </button>
            )}
          </div>
        </div>

        {/* View Mode: Competitor Comparison Cards */}
        {!isOverrideMode ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {editableScores.map((scoreItem, idx) => (
              <div
                key={scoreItem.participantId}
                className={`p-6 rounded-2xl border transition-all flex flex-col justify-between ${
                  scoreItem.isWinner
                    ? 'bg-gradient-to-br from-emerald-500/10 via-slate-900 to-slate-950 border-emerald-500/40 shadow-glow-emerald'
                    : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div className="space-y-4">
                  {/* Top Competitor Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 font-bold font-heading">
                        {scoreItem.competitorName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 uppercase">
                          Competitor {idx + 1}
                        </span>
                        <h3 className="font-heading font-extrabold text-lg text-white">
                          {scoreItem.competitorName}
                        </h3>
                      </div>
                    </div>

                    {scoreItem.isWinner && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 uppercase">
                        Winner
                      </span>
                    )}
                  </div>

                  {/* Stats Matrix */}
                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-center">
                      <span className="text-[10px] font-mono text-slate-400 uppercase block">
                        Points / Score
                      </span>
                      <span className="text-2xl font-mono font-extrabold text-cyan-400">
                        {scoreItem.score}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-center">
                      <span className="text-[10px] font-mono text-slate-400 uppercase block">
                        Kills / Frags
                      </span>
                      <span className="text-2xl font-mono font-extrabold text-slate-200">
                        {scoreItem.kills}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-center">
                      <span className="text-[10px] font-mono text-slate-400 uppercase block">
                        Placement Rank
                      </span>
                      <span className="text-2xl font-mono font-extrabold text-amber-400">
                        #{scoreItem.placement || idx + 1}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Disciplinary Action Launch for this Competitor */}
                <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-500">
                    Participant ID: {scoreItem.participantId.slice(0, 8)}...
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setSanctionTarget({
                        id: scoreItem.participantId,
                        name: scoreItem.competitorName
                      })
                    }
                    className="px-3 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-mono flex items-center gap-1 transition-colors"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Issue Sanction</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Edit & Override Mode Form */
          <form onSubmit={handleOverrideSubmit} className="space-y-6">
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-300">
              <span className="font-bold">Edit & Override Active:</span> Modify score values, kills, or placement rank below. Referee explanation notes are required for all manual score changes.
            </div>

            <div className="space-y-4">
              {editableScores.map((scoreItem, idx) => (
                <div
                  key={scoreItem.participantId}
                  className="p-5 rounded-2xl bg-slate-900/80 border border-slate-700/80 grid grid-cols-1 sm:grid-cols-4 gap-4 items-center"
                >
                  <div className="sm:col-span-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block">
                      Competitor {idx + 1}
                    </span>
                    <h4 className="font-heading font-bold text-white text-base">
                      {scoreItem.competitorName}
                    </h4>
                    <label className="inline-flex items-center gap-2 mt-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={scoreItem.isWinner}
                        onChange={(e) =>
                          handleScoreChange(idx, 'isWinner', e.target.checked)
                        }
                        className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                      />
                      <span className="text-xs font-mono text-emerald-400 font-bold">
                        Mark as Winner
                      </span>
                    </label>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-slate-300">Points / Score</label>
                    <input
                      type="number"
                      value={scoreItem.score}
                      onChange={(e) =>
                        handleScoreChange(idx, 'score', Number(e.target.value))
                      }
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-sm focus:border-cyan-400"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-slate-300">Kills / Frags</label>
                    <input
                      type="number"
                      value={scoreItem.kills}
                      onChange={(e) =>
                        handleScoreChange(idx, 'kills', Number(e.target.value))
                      }
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-sm focus:border-cyan-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-slate-300">Placement Rank</label>
                    <input
                      type="number"
                      min={1}
                      value={scoreItem.placement ?? ''}
                      onChange={(e) =>
                        handleScoreChange(idx, 'placement', e.target.value ? Number(e.target.value) : null)
                      }
                      placeholder="e.g. 1"
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-sm focus:border-cyan-400"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Mandatory Notes */}
            <div className="space-y-1 pt-2">
              <label className="text-xs font-mono text-slate-300 flex items-center gap-1">
                <span>Referee Correction Notes (Mandatory for Overrides)</span>
                <span className="text-red-400">*</span>
              </label>
              <textarea
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                rows={3}
                placeholder="Explain reason for adjusting reported kills, scores, or winner placement..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 resize-none"
                required
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsOverrideMode(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl"
              >
                Cancel Override
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-heading font-bold text-xs uppercase tracking-wider shadow-glow-cyan flex items-center gap-1.5 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>{submitting ? 'Overriding...' : 'Save & Certify Override'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Verification & Sign-off Actions Toolbar */}
        {!isOverrideMode && (
          <div className="pt-6 border-t border-slate-800 space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-mono text-slate-300">
                Official Verification Notes (Optional if approving as-is)
              </label>
              <input
                type="text"
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                placeholder="Official scorecard approved by referee."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <div className="flex items-center space-x-2 text-xs text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Approving will advance the winner to the next round fixture.</span>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setIsOverrideMode(true)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-heading font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  <Edit3 className="w-4 h-4 text-cyan-400" />
                  <span>Edit & Override</span>
                </button>

                <button
                  type="button"
                  onClick={handleApproveFinalize}
                  disabled={submitting || (match.isVerified && !verificationNotes)}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-heading font-extrabold text-xs uppercase tracking-wider shadow-lg flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{submitting ? 'Finalizing...' : 'Approve & Finalize'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Disciplinary Sanction Modal */}
      {sanctionTarget && (
        <SanctionModal
          isOpen={true}
          onClose={() => setSanctionTarget(null)}
          targetId={sanctionTarget.id}
          targetName={sanctionTarget.name}
          tournamentId={match.tournamentId}
          tournamentTitle={match.tournament.title}
          matchId={match.id}
          onSuccess={() => {
            loadMatch();
          }}
        />
      )}
    </div>
  );
};

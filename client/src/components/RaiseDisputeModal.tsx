import React, { useState } from 'react';
import { AlertCircle, X, ShieldAlert, Send, Link as LinkIcon, FileText } from 'lucide-react';
import { disputeApi } from '../services/dispute.service';

interface MatchOption {
  id: string;
  matchNumber: number;
  roundName?: string;
}

interface RaiseDisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
  matches?: MatchOption[];
  initialMatchId?: string;
  onSuccess?: (dispute: any) => void;
}

export const RaiseDisputeModal: React.FC<RaiseDisputeModalProps> = ({
  isOpen,
  onClose,
  tournamentId,
  matches = [],
  initialMatchId,
  onSuccess
}) => {
  const [matchId, setMatchId] = useState(initialMatchId || (matches[0]?.id ?? ''));
  const [reason, setReason] = useState('INCORRECT_SCORE');
  const [description, setDescription] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchId) {
      setError('Please select the contested match.');
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      setError('Please provide a detailed description (minimum 10 characters).');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await disputeApi.createDispute(tournamentId, {
        matchId,
        reason,
        description: description.trim(),
        proofUrl: proofUrl.trim() || undefined
      });

      setSubmitted(true);
      if (onSuccess) {
        onSuccess(res.data);
      }
      setTimeout(() => {
        setSubmitted(false);
        setDescription('');
        setProofUrl('');
        onClose();
      }, 1600);
    } catch (err: any) {
      setError(
        err.response?.data?.error || err.message || 'Failed to submit dispute ticket. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden border-t-2 border-t-rose-500">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-heading font-bold text-white tracking-wide">
                RAISE MATCH DISPUTE
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Submit violation ticket to tournament staff & organizers
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        {submitted ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3 animate-bounce">
              <Send className="w-6 h-6" />
            </div>
            <h4 className="text-base font-heading font-bold text-white mb-1">
              Dispute Ticket Submitted
            </h4>
            <p className="text-xs text-slate-400">
              Match status flagged as disputed. Tournament organizers and staff have been notified for review.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-xs text-red-300">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Match Select */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider font-mono">
                Select Match
              </label>
              {matches.length > 0 ? (
                <select
                  value={matchId}
                  onChange={(e) => setMatchId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                  required
                >
                  {matches.map((m) => (
                    <option key={m.id} value={m.id}>
                      Match #{m.matchNumber} {m.roundName ? `(${m.roundName})` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={matchId}
                  onChange={(e) => setMatchId(e.target.value)}
                  placeholder="Enter Match ID"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                  required
                />
              )}
            </div>

            {/* Violation Reason */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider font-mono">
                Dispute Reason
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
              >
                <option value="INCORRECT_SCORE">Incorrect Score Entry / Wrong Kills</option>
                <option value="CHEATING">Suspected Cheating / Exploits / Scripting</option>
                <option value="TOXIC_CONDUCT">Toxic Conduct / Unsportsmanlike Behavior</option>
                <option value="NO_SHOW">Opponent No-Show / False Check-In</option>
                <option value="OTHER">Other Tournament Rule Violation</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider font-mono">
                Detailed Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Clearly explain the incident with timestamps, round number, player names, or scorecard discrepancies..."
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 resize-none leading-relaxed"
                required
              />
            </div>

            {/* Screenshot / Proof Link */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider font-mono">
                Proof / Evidence URL (Optional)
              </label>
              <div className="relative">
                <LinkIcon className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="url"
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  placeholder="https://clips.twitch.tv/... or imgur.com/..."
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Provide video stream replay clips, screenshot proof, or tournament room log URLs.
              </p>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-lg shadow-rose-950/40 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Dispute</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

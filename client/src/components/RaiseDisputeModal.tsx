import React, { useState } from 'react';
import { AlertCircle, X, ShieldAlert, CheckCircle2, Upload, ExternalLink } from 'lucide-react';
import { DisputeAPI } from '../api/dispute.service';

interface RaiseDisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
  tournamentTitle: string;
  matchId?: string;
  matchNumber?: number;
  onDisputeSubmitted?: () => void;
}

export const RaiseDisputeModal: React.FC<RaiseDisputeModalProps> = ({
  isOpen,
  onClose,
  tournamentId,
  tournamentTitle,
  matchId,
  matchNumber,
  onDisputeSubmitted
}) => {
  const [reason, setReason] = useState('INCORRECT_SCORE');
  const [description, setDescription] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Please provide a detailed description of the incident.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await DisputeAPI.raiseDispute(tournamentId, {
        matchId,
        reason,
        description: description.trim(),
        proofUrl: proofUrl.trim() || undefined
      });

      setSuccess(true);
      if (onDisputeSubmitted) {
        onDisputeSubmitted();
      }
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1800);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to submit dispute ticket.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-white">Raise Match Dispute</h3>
              <p className="text-xs text-slate-400">
                {tournamentTitle} {matchNumber ? `• Match #${matchNumber}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Banner */}
        {success ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="font-heading font-bold text-lg text-white">Dispute Ticket Filed</h4>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Referees and tournament organizers have been alerted and will review the evidence promptly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Reason Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase font-mono tracking-wider mb-1.5">
                Dispute Reason
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
              >
                <option value="INCORRECT_SCORE">Incorrect Score Entry / Placement</option>
                <option value="CHEATING">Suspected Cheating / Exploits</option>
                <option value="TOXIC_CONDUCT">Unsportsmanlike / Toxic Conduct</option>
                <option value="RULE_VIOLATION">Tournament Rule Violation</option>
                <option value="OTHER">Other Match Grievance</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase font-mono tracking-wider mb-1.5">
                Incident Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Clearly describe what occurred, timestamps in video/vod, and what the correct outcome should be..."
                rows={4}
                required
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors resize-none"
              />
            </div>

            {/* Proof URL */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase font-mono tracking-wider mb-1.5">
                Screenshot / Proof Link (URL)
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  placeholder="https://imgur.com/..., twitch clip, youtube vod link"
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
                <ExternalLink className="absolute right-3.5 top-3 w-4 h-4 text-slate-500" />
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Provide verifiable screenshots, stream clips, or scoreboard captures.
              </span>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded-xl shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50 flex items-center space-x-2"
              >
                {loading ? (
                  <span>Submitting...</span>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4" />
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

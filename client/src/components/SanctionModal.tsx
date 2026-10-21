import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Ban,
  UserX,
  X,
  Send,
  Link as LinkIcon,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { refereeApi, SanctionInput } from '../services/referee.service';

interface SanctionModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string; // participantId or userId
  targetName: string;
  tournamentId?: string;
  tournamentTitle?: string;
  matchId?: string;
  onSuccess?: () => void;
}

export const SanctionModal: React.FC<SanctionModalProps> = ({
  isOpen,
  onClose,
  targetId,
  targetName,
  tournamentId,
  tournamentTitle,
  matchId,
  onSuccess
}) => {
  const [action, setAction] = useState<'ISSUE_WARNING' | 'DISQUALIFY_MATCH' | 'ESCALATE_ADMIN'>('ISSUE_WARNING');
  const [reason, setReason] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a reason for this disciplinary sanction.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const payload: SanctionInput = {
        action,
        reason: reason.trim(),
        tournamentId,
        matchId,
        evidenceUrl: evidenceUrl.trim() || undefined,
        notes: notes.trim() || undefined
      };

      const res = await refereeApi.sanctionPlayer(targetId, payload);
      setSuccessMsg(res.message || 'Sanction issued successfully.');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to issue disciplinary sanction.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6 text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg text-white">Disciplinary Sanction</h3>
              <p className="text-xs text-slate-400">
                Target: <span className="text-cyan-400 font-semibold">{targetName}</span>
                {tournamentTitle && <span> • {tournamentTitle}</span>}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Type Tabs */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setAction('ISSUE_WARNING')}
              className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                action === 'ISSUE_WARNING'
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                  : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-white'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-heading font-semibold">Issue Warning</span>
            </button>

            <button
              type="button"
              onClick={() => setAction('DISQUALIFY_MATCH')}
              className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                action === 'DISQUALIFY_MATCH'
                  ? 'bg-red-500/15 border-red-500/40 text-red-400'
                  : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-white'
              }`}
            >
              <UserX className="w-4 h-4" />
              <span className="text-xs font-heading font-semibold">Disqualify Match</span>
            </button>

            <button
              type="button"
              onClick={() => setAction('ESCALATE_ADMIN')}
              className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                action === 'ESCALATE_ADMIN'
                  ? 'bg-purple-500/15 border-purple-500/40 text-purple-300'
                  : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-white'
              }`}
            >
              <Ban className="w-4 h-4" />
              <span className="text-xs font-heading font-semibold">Escalate to Admin</span>
            </button>
          </div>

          {/* Description of Selected Action */}
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-xs text-slate-300 leading-relaxed">
            {action === 'ISSUE_WARNING' && (
              <p>
                Logs an official warning on the player's tournament record and issues an instant notification. Repeated warnings may result in automatic disqualification.
              </p>
            )}
            {action === 'DISQUALIFY_MATCH' && (
              <p>
                Disqualifies player/team from current match, forfeiting match scores and advancing the opponent in bracket play.
              </p>
            )}
            {action === 'ESCALATE_ADMIN' && (
              <p>
                Flags player for platform-wide ban review. Sends high-priority audit dispatch to Super Administrators with attached evidence.
              </p>
            )}
          </div>

          {/* Reason Input */}
          <div className="space-y-1">
            <label className="text-xs font-mono text-slate-300 flex items-center gap-1">
              <span>Sanction Reason / Incident Description</span>
              <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Unsportsmanlike conduct, using forbidden weapon, macro usage"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              required
            />
          </div>

          {/* Evidence URL Input */}
          <div className="space-y-1">
            <label className="text-xs font-mono text-slate-300 flex items-center gap-1">
              <LinkIcon className="w-3 h-3 text-cyan-400" />
              <span>Evidence Screenshot / Video URL (Optional)</span>
            </label>
            <input
              type="url"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              placeholder="https://imgur.com/... or https://youtube.com/..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Additional Notes */}
          <div className="space-y-1">
            <label className="text-xs font-mono text-slate-300 flex items-center gap-1">
              <FileText className="w-3 h-3 text-slate-400" />
              <span>Internal Referee Notes (Optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Context or timeline details for tournament records..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 resize-none"
            />
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-5 py-2 text-xs font-heading font-bold rounded-xl text-black transition-all shadow-lg flex items-center gap-1.5 ${
                action === 'DISQUALIFY_MATCH'
                  ? 'bg-red-500 hover:bg-red-400 shadow-red-500/20'
                  : action === 'ESCALATE_ADMIN'
                  ? 'bg-purple-400 hover:bg-purple-300 shadow-purple-500/20'
                  : 'bg-amber-400 hover:bg-amber-300 shadow-amber-500/20'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Executing...' : 'Apply Sanction'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

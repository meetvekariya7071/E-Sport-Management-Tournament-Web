import React, { useState } from 'react';
import {
  AlertTriangle,
  XCircle,
  ShieldAlert,
  Send,
  X,
  CheckCircle,
  FileText,
  Link as LinkIcon
} from 'lucide-react';
import { RefereeAPI } from '../api/referee.service';
import { useToast } from '../context/ToastContext';

interface DisciplinaryTarget {
  participantId?: string;
  userId?: string;
  username: string;
  teamName?: string;
  tournamentId?: string;
  matchId?: string;
}

interface DisciplinaryActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: DisciplinaryTarget | null;
  onSuccess?: () => void;
}

export const DisciplinaryActionModal: React.FC<DisciplinaryActionModalProps> = ({
  isOpen,
  onClose,
  target,
  onSuccess
}) => {
  const toast = useToast();
  const [sanctionType, setSanctionType] = useState<'WARNING' | 'MATCH_DISQUALIFY' | 'ESCALATE_ADMIN'>('WARNING');
  const [reason, setReason] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !target) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.warning('Mandatory Reason', 'Please provide a detailed explanation of the infraction.');
      return;
    }

    try {
      setLoading(true);
      const targetId = target.participantId || target.userId;
      if (!targetId) {
        toast.error('Error', 'Unable to locate participant ID.');
        return;
      }

      const res = await RefereeAPI.sanctionPlayer(targetId, {
        sanctionType,
        reason: reason.trim(),
        tournamentId: target.tournamentId,
        matchId: target.matchId,
        proofUrl: proofUrl.trim() || undefined
      });

      if (res.success) {
        toast.success(
          sanctionType === 'WARNING'
            ? 'Warning Issued'
            : sanctionType === 'MATCH_DISQUALIFY'
            ? 'Match Disqualification Enforced'
            : 'Escalated to Administrators',
          res.message
        );
        onSuccess?.();
        handleClose();
      }
    } catch (err: any) {
      toast.error('Action Failed', err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setProofUrl('');
    setSanctionType('WARNING');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-surface border border-neutral-700 rounded-2xl shadow-2xl overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-700/80 bg-neutral-900/60">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl ${
              sanctionType === 'WARNING'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : sanctionType === 'MATCH_DISQUALIFY'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
            }`}>
              {sanctionType === 'WARNING' && <AlertTriangle className="w-5 h-5" />}
              {sanctionType === 'MATCH_DISQUALIFY' && <XCircle className="w-5 h-5" />}
              {sanctionType === 'ESCALATE_ADMIN' && <ShieldAlert className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-wide">
                Issue Disciplinary Sanction
              </h3>
              <p className="text-xs text-neutral-400">
                Referee Enforcement & Rules Compliance
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Details Badge */}
        <div className="px-6 py-3 bg-neutral-900/40 border-b border-neutral-800 flex items-center justify-between text-xs">
          <span className="text-neutral-400">Target Player / Roster:</span>
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-white font-mono bg-neutral-800 px-2.5 py-1 rounded-md">
              {target.username}
            </span>
            {target.teamName && (
              <span className="text-primary-400 font-medium">({target.teamName})</span>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Sanction Type Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider">
              Sanction Level
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setSanctionType('WARNING')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition ${
                  sanctionType === 'WARNING'
                    ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-bold shadow-lg shadow-amber-500/10'
                    : 'bg-neutral-800/60 border-neutral-700/80 text-neutral-400 hover:border-neutral-600 hover:text-neutral-200'
                }`}
              >
                <AlertTriangle className="w-4 h-4 mb-1 text-amber-400" />
                <span className="text-xs">Warning</span>
                <span className="text-[10px] opacity-75 font-normal">Tournament Record</span>
              </button>

              <button
                type="button"
                onClick={() => setSanctionType('MATCH_DISQUALIFY')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition ${
                  sanctionType === 'MATCH_DISQUALIFY'
                    ? 'bg-rose-500/15 border-rose-500 text-rose-300 font-bold shadow-lg shadow-rose-500/10'
                    : 'bg-neutral-800/60 border-neutral-700/80 text-neutral-400 hover:border-neutral-600 hover:text-neutral-200'
                }`}
              >
                <XCircle className="w-4 h-4 mb-1 text-rose-400" />
                <span className="text-xs">Disqualify</span>
                <span className="text-[10px] opacity-75 font-normal">Match Forfeit</span>
              </button>

              <button
                type="button"
                onClick={() => setSanctionType('ESCALATE_ADMIN')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition ${
                  sanctionType === 'ESCALATE_ADMIN'
                    ? 'bg-purple-500/15 border-purple-500 text-purple-300 font-bold shadow-lg shadow-purple-500/10'
                    : 'bg-neutral-800/60 border-neutral-700/80 text-neutral-400 hover:border-neutral-600 hover:text-neutral-200'
                }`}
              >
                <ShieldAlert className="w-4 h-4 mb-1 text-purple-400" />
                <span className="text-xs">Escalate</span>
                <span className="text-[10px] opacity-75 font-normal">Platform Ban</span>
              </button>
            </div>
          </div>

          {/* Explanation / Impact alert */}
          <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800 text-xs space-y-1">
            <span className="font-semibold text-neutral-200">Enforcement Consequence:</span>
            <p className="text-neutral-400 leading-relaxed">
              {sanctionType === 'WARNING' &&
                'Logs an official disciplinary warning on the player tournament profile. Sent via instant player alert.'}
              {sanctionType === 'MATCH_DISQUALIFY' &&
                'Disqualifies player/team from this match (isMatchDisqualified: true). Forfeits match points and awards win to opponent.'}
              {sanctionType === 'ESCALATE_ADMIN' &&
                'Sends high-priority escalation ticket with attached match logs to Platform Super Administrators for permanent account ban review.'}
            </p>
          </div>

          {/* Mandatory Reason */}
          <div className="space-y-1.5">
            <label className="flex items-center justify-between text-xs font-semibold text-neutral-300 uppercase tracking-wider">
              <span className="flex items-center">
                <FileText className="w-3.5 h-3.5 mr-1 text-neutral-400" />
                Mandatory Reason & Official Notes *
              </span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Detail the infraction, rule book clause violated, or observed misconduct..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition resize-none"
            />
          </div>

          {/* Evidence Link */}
          <div className="space-y-1.5">
            <label className="flex items-center text-xs font-semibold text-neutral-300 uppercase tracking-wider">
              <LinkIcon className="w-3.5 h-3.5 mr-1 text-neutral-400" />
              Evidence Link / Video Timestamp (Optional)
            </label>
            <input
              type="url"
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
              placeholder="https://clips.twitch.tv/... or screenshot URL"
              className="w-full px-3.5 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-primary-500 transition"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl border border-neutral-700 text-neutral-300 hover:bg-neutral-800 text-xs font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex items-center px-5 py-2 rounded-xl text-xs font-bold text-white shadow-lg transition disabled:opacity-50 ${
                sanctionType === 'WARNING'
                  ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
                  : sanctionType === 'MATCH_DISQUALIFY'
                  ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                  : 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/20'
              }`}
            >
              {loading ? (
                <span>Enforcing...</span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  <span>Enforce {sanctionType === 'WARNING' ? 'Warning' : sanctionType === 'MATCH_DISQUALIFY' ? 'Disqualification' : 'Escalation'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

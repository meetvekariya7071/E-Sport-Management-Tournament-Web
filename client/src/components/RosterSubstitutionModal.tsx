import React, { useState } from 'react';
import { UserCheck, AlertCircle, Check, X, Users, RefreshCw } from 'lucide-react';
import { tournamentService } from '../services/tournament.service';

interface TeamMemberItem {
  userId: string;
  username: string;
  role: string;
}

interface RosterSubstitutionModalProps {
  tournamentId: string;
  tournamentTitle: string;
  teamId: string;
  teamName: string;
  members: TeamMemberItem[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const RosterSubstitutionModal: React.FC<RosterSubstitutionModalProps> = ({
  tournamentId,
  tournamentTitle,
  teamId,
  teamName,
  members,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [outgoingUserId, setOutgoingUserId] = useState<string>(members[0]?.userId || '');
  const [incomingIdentifier, setIncomingIdentifier] = useState<string>('');
  const [inGameName, setInGameName] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubstitute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outgoingUserId || !incomingIdentifier.trim()) {
      setErrorMsg('Please select a player to replace and enter the substitute account username or email.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await tournamentService.substituteTeamPlayer(tournamentId, teamId, {
        outgoingUserId,
        incomingIdentifier: incomingIdentifier.trim(),
        inGameName: inGameName.trim() || undefined
      });

      setSuccessMsg(res.message || 'Roster substitution completed successfully.');
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to complete roster substitution.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Emergency Substitution</h3>
              <p className="text-xs text-slate-400">Team: {teamName} &bull; {tournamentTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubstitute} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Player to Replace (Inactive / Dropout)
            </label>
            <select
              value={outgoingUserId}
              onChange={(e) => setOutgoingUserId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.username} ({m.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Substitute Username or Email <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. ShadowViper or player@esports.com"
              value={incomingIdentifier}
              onChange={(e) => setIncomingIdentifier(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Substitute In-Game Name (IGN)
            </label>
            <input
              type="text"
              placeholder="e.g. VIPER_99"
              value={inGameName}
              onChange={(e) => setInGameName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
            Emergency substitution slots the replacement directly into your active starter roster without disbanding your team or forfeiting your bracket seed.
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 rounded-xl transition shadow-lg shadow-cyan-500/20 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${submitting ? 'animate-spin' : ''}`} />
              {submitting ? 'Swapping...' : 'Confirm Substitution'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RosterSubstitutionModal;

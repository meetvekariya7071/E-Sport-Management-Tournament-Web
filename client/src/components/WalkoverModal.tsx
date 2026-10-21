import React, { useState } from 'react';
import { Trophy, AlertTriangle, X, Check, FastForward } from 'lucide-react';
import { BracketMatch } from '../types';
import { tournamentService } from '../services/tournament.service';

interface WalkoverModalProps {
  tournamentId: string;
  match: BracketMatch | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const WalkoverModal: React.FC<WalkoverModalProps> = ({
  tournamentId,
  match,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [winnerParticipantId, setWinnerParticipantId] = useState<string>('');
  const [reasonPreset, setReasonPreset] = useState<string>('Opponent failed to check in within required window (No Show).');
  const [customReason, setCustomReason] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !match) return null;

  const comp1 = match.competitors[0];
  const comp2 = match.competitors[1];

  const handleAwardWalkover = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetWinner = winnerParticipantId || comp1?.participantId;
    if (!targetWinner) {
      setErrorMsg('Please select a competitor to award the walkover to.');
      return;
    }

    const finalReason = customReason.trim() ? customReason.trim() : reasonPreset;

    const forfeitParticipant = match.competitors.find((c) => c.participantId !== targetWinner);

    setSubmitting(true);
    setErrorMsg(null);

    try {
      await tournamentService.awardWalkover(tournamentId, match.id, {
        winnerParticipantId: targetWinner,
        forfeitParticipantId: forfeitParticipant?.participantId,
        reason: finalReason
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to award walkover.');
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
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <FastForward className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Award Walkover / Bye</h3>
              <p className="text-xs text-slate-400">Match #{match.matchNumber} Emergency Forfeiture</p>
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
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleAwardWalkover} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Select Advancing Winner (Receiving Bye)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {comp1 && (
                <button
                  type="button"
                  onClick={() => setWinnerParticipantId(comp1.participantId)}
                  className={`p-3 rounded-xl border text-left transition ${
                    (winnerParticipantId || comp1.participantId) === comp1.participantId
                      ? 'bg-amber-500/10 border-amber-500/50 text-amber-200 ring-2 ring-amber-500/20'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold truncate">{comp1.name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Slot 1 Competitor</div>
                </button>
              )}

              {comp2 && (
                <button
                  type="button"
                  onClick={() => setWinnerParticipantId(comp2.participantId)}
                  className={`p-3 rounded-xl border text-left transition ${
                    winnerParticipantId === comp2.participantId
                      ? 'bg-amber-500/10 border-amber-500/50 text-amber-200 ring-2 ring-amber-500/20'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold truncate">{comp2.name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Slot 2 Competitor</div>
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Forfeiture Reason Preset
            </label>
            <select
              value={reasonPreset}
              onChange={(e) => setReasonPreset(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="Opponent failed to check in within required window (No Show).">
                Opponent failed to check in (No Show)
              </option>
              <option value="Player/Team disqualified for tournament rule infraction.">
                Rule Infraction / Disqualification
              </option>
              <option value="Technical disconnection / hardware forfeit confirmed by referee.">
                Hardware / Connection Forfeit
              </option>
              <option value="Unfilled bracket slot auto-bye.">
                Unfilled Bracket Bye
              </option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Custom Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="Additional referee or organizer remarks..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
            Awarding a walkover will conclude Match #{match.matchNumber}, score the winner 1-0, flag the forfeiting competitor, and auto-advance the winner to the next round bracket fixture.
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
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl transition shadow-lg shadow-amber-500/20 disabled:opacity-50"
            >
              <FastForward className="w-3.5 h-3.5" />
              {submitting ? 'Awarding...' : 'Confirm Walkover & Advance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WalkoverModal;

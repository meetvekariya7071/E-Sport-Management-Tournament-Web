import React, { useState } from 'react';
import { Shield, ArrowUp, ArrowDown, Check, X, Award, Crosshair, Flag, Swords, AlertCircle } from 'lucide-react';
import { tournamentService } from '../services/tournament.service';

interface TieBreakerSelectorModalProps {
  tournamentId: string;
  initialRules?: string[];
  isOpen: boolean;
  onClose: () => void;
  onRulesUpdated?: (newRules: string[]) => void;
}

const RULE_METADATA: Record<string, { label: string; desc: string; icon: React.ReactNode }> = {
  TOTAL_POINTS: {
    label: 'Total Points',
    desc: 'Cumulative rank points + kill points across all played rounds.',
    icon: <Award className="w-4 h-4 text-amber-400" />
  },
  TOTAL_KILLS: {
    label: 'Total Kills / Frags',
    desc: 'Total eliminations / frags recorded by the player or team.',
    icon: <Crosshair className="w-4 h-4 text-rose-400" />
  },
  FINAL_ROUND_PLACEMENT: {
    label: 'Final Round Placement',
    desc: 'Best placement achieved in the concluding / highest numbered round.',
    icon: <Flag className="w-4 h-4 text-cyan-400" />
  },
  HEAD_TO_HEAD: {
    label: 'Head-to-Head History',
    desc: 'Direct match win record between the tied competitors.',
    icon: <Swords className="w-4 h-4 text-indigo-400" />
  }
};

const DEFAULT_ORDER = [
  'TOTAL_POINTS',
  'TOTAL_KILLS',
  'FINAL_ROUND_PLACEMENT',
  'HEAD_TO_HEAD'
];

export const TieBreakerSelectorModal: React.FC<TieBreakerSelectorModalProps> = ({
  tournamentId,
  initialRules,
  isOpen,
  onClose,
  onRulesUpdated
}) => {
  const [rules, setRules] = useState<string[]>(
    initialRules && initialRules.length > 0 ? initialRules : DEFAULT_ORDER
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const moveRule = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= rules.length) return;

    const nextRules = [...rules];
    const [moved] = nextRules.splice(index, 1);
    nextRules.splice(targetIndex, 0, moved);
    setRules(nextRules);
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await tournamentService.updateTieBreakerRules(tournamentId, rules);
      setSuccessMsg('Tie-breaker hierarchy updated and standings recalculated.');
      if (onRulesUpdated) {
        onRulesUpdated(rules);
      }
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to update tie-breaker rules.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Tie-Breaker Rule Hierarchy</h3>
              <p className="text-xs text-slate-400">Re-order evaluation priority for tied tournament scores</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notices */}
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

        {/* Re-orderable List */}
        <div className="mt-5 space-y-2.5">
          {rules.map((ruleKey, idx) => {
            const meta = RULE_METADATA[ruleKey] || {
              label: ruleKey,
              desc: 'Custom rule criteria',
              icon: <Award className="w-4 h-4 text-cyan-400" />
            };

            return (
              <div
                key={ruleKey}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <span className="w-6 h-6 rounded-md bg-slate-800 text-cyan-400 text-xs font-mono font-bold flex items-center justify-center shrink-0">
                    #{idx + 1}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-center shrink-0">
                    {meta.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-200 truncate">{meta.label}</div>
                    <div className="text-[11px] text-slate-400 truncate">{meta.desc}</div>
                  </div>
                </div>

                {/* Move Controls */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    disabled={idx === 0 || isSubmitting}
                    onClick={() => moveRule(idx, 'up')}
                    className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    title="Move Up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    disabled={idx === rules.length - 1 || isSubmitting}
                    onClick={() => moveRule(idx, 'down')}
                    className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    title="Move Down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            onClick={() => setRules(DEFAULT_ORDER)}
            disabled={isSubmitting}
            className="px-3 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
          >
            Reset Default
          </button>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 rounded-xl transition shadow-lg shadow-cyan-500/20 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Apply Tie-Breaker Order'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TieBreakerSelectorModal;

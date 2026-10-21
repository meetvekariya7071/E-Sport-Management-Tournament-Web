import React, { useState } from 'react';
import { X, Users, User, ShieldCheck, AlertCircle } from 'lucide-react';
import { tournamentService } from '../services/tournament.service';
import { Tournament } from '../types';

interface JoinModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: Tournament | null;
  onSuccess: () => void;
}

export const JoinTournamentModal: React.FC<JoinModalProps> = ({
  isOpen,
  onClose,
  tournament,
  onSuccess
}) => {
  const [teamName, setTeamName] = useState('');
  const [teamTag, setTeamTag] = useState('');
  const [partner1, setPartner1] = useState('');
  const [partner2, setPartner2] = useState('');
  const [partner3, setPartner3] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !tournament) return null;

  const isSolo = tournament.format === 'SOLO';
  const isDuo = tournament.format === 'DUO';
  const isSquad = tournament.format === 'SQUAD';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (isSolo) {
        // Solo tournament: bypass team generation completely
        await tournamentService.joinTournament(tournament.id, {});
      } else {
        const partnerUserIds: string[] = [];
        if (partner1.trim()) partnerUserIds.push(partner1.trim());
        if (isSquad) {
          if (partner2.trim()) partnerUserIds.push(partner2.trim());
          if (partner3.trim()) partnerUserIds.push(partner3.trim());
        }

        await tournamentService.joinTournament(tournament.id, {
          teamName: teamName.trim(),
          teamTag: teamTag.trim() || undefined,
          partnerUserIds
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6 text-slate-100 gaming-card">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center space-x-3 text-cyan-400">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
              {isSolo ? <User className="w-5 h-5" /> : <Users className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg text-white">
                JOIN TOURNAMENT
              </h3>
              <p className="text-xs text-slate-400">
                {tournament.title} • <span className="text-cyan-400 font-mono">{tournament.format}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSolo ? (
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 space-y-2">
              <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-sm">
                <ShieldCheck className="w-4 h-4" />
                <span>Solo Competitor Format</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                You will be directly registered to the bracket without team generation. Your official
                profile rating and ELO will be tied directly to your match scores.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Team Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g. Shadow Strikers"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Clan Tag
                  </label>
                  <input
                    type="text"
                    maxLength={5}
                    value={teamTag}
                    onChange={(e) => setTeamTag(e.target.value)}
                    placeholder="TAG"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 uppercase"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="block text-xs font-medium text-slate-300">
                  Teammate User IDs (Required for {tournament.format})
                </label>
                <input
                  type="text"
                  required
                  value={partner1}
                  onChange={(e) => setPartner1(e.target.value)}
                  placeholder="Partner 1 User UUID"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono text-xs"
                />

                {isSquad && (
                  <>
                    <input
                      type="text"
                      required
                      value={partner2}
                      onChange={(e) => setPartner2(e.target.value)}
                      placeholder="Partner 2 User UUID"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono text-xs"
                    />
                    <input
                      type="text"
                      required
                      value={partner3}
                      onChange={(e) => setPartner3(e.target.value)}
                      placeholder="Partner 3 User UUID"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono text-xs"
                    />
                  </>
                )}
                <span className="text-[11px] text-slate-400 block">
                  Tip: Copy Partner User UUIDs from the Player profile or Admin overview.
                </span>
              </div>
            </>
          )}

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-black shadow-glow-cyan font-heading tracking-wide transition-all"
            >
              {isSubmitting ? 'Registering...' : isSolo ? 'Confirm Solo Registration' : 'Register Roster'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

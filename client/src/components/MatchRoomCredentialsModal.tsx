import React, { useState, useEffect } from 'react';
import { KeyRound, Copy, Check, Lock, ShieldAlert, Radio, X, AlertCircle, Info, Send } from 'lucide-react';
import { tournamentService } from '../services/tournament.service';
import { useAuth } from '../context/AuthContext';

interface MatchRoomCredentialsModalProps {
  tournamentId: string;
  matchId: string;
  matchNumber: number;
  matchStatus?: string;
  isOpen: boolean;
  onClose: () => void;
  isStaff?: boolean;
}

export const MatchRoomCredentialsModal: React.FC<MatchRoomCredentialsModalProps> = ({
  tournamentId,
  matchId,
  matchNumber,
  matchStatus,
  isOpen,
  onClose,
  isStaff = false
}) => {
  const { user } = useAuth();
  const [roomId, setRoomId] = useState('');
  const [password, setPassword] = useState('');
  const [instructions, setInstructions] = useState('');
  const [isConcluded, setIsConcluded] = useState(matchStatus === 'COMPLETED');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const canEdit = isStaff || user?.role === 'ADMIN' || user?.role === 'ORGANIZER' || user?.role === 'REFEREE';

  useEffect(() => {
    if (!isOpen) return;
    fetchCredentials();
  }, [isOpen, matchId]);

  const fetchCredentials = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await tournamentService.getMatchCredentials(tournamentId, matchId);
      if (res.isConcluded) {
        setIsConcluded(true);
      } else {
        setIsConcluded(false);
        setRoomId(res.customRoomId || '');
        setPassword(res.customRoomPassword || '');
        setInstructions(res.roomInstructions || '');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to retrieve match room credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId.trim()) {
      setErrorMsg('Room ID / Server Name is required.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await tournamentService.setMatchCredentials(tournamentId, matchId, {
        customRoomId: roomId.trim(),
        customRoomPassword: password.trim() || undefined,
        roomInstructions: instructions.trim() || undefined
      });
      setSuccessMsg('Custom lobby credentials published to verified match participants.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to publish match credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">Custom Lobby Pass</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Match #{matchNumber}
                </span>
              </div>
              <p className="text-xs text-slate-400">Private server credentials & lobby verification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts */}
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

        {/* Match Concluded Safeguard Card */}
        {isConcluded ? (
          <div className="my-6 p-6 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700 mx-auto flex items-center justify-center text-slate-400 mb-3">
              <Lock className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-200">Match Concluded & Credentials Cleared</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1.5">
              To preserve fair play and prevent unauthorized lobby access, private server credentials are automatically expired once the match concludes.
            </p>
          </div>
        ) : loading ? (
          <div className="py-12 text-center text-slate-400 text-sm animate-pulse">
            Retrieving secure lobby telemetry...
          </div>
        ) : canEdit ? (
          /* Organizer / Staff Credentials Dispatch Form */
          <form onSubmit={handleSaveCredentials} className="mt-5 space-y-4">
            <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-800/40 text-indigo-300 text-xs flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Credentials entered here are dispatched exclusively to confirmed checked-in competitors of Match #{matchNumber}.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Room ID / Custom Server Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. BGMI-PRO-ROOM-14 or Valorant Custom Lobby"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Room Password / PIN
              </label>
              <input
                type="text"
                placeholder="e.g. Match@8842"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Lobby Instructions / Voice Server Link
              </label>
              <textarea
                placeholder="e.g. Server region: Frankfurt. Spectator slots restricted. Join Discord voice channel #TeamA."
                rows={2}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 rounded-xl transition shadow-lg shadow-indigo-600/30 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {submitting ? 'Publishing...' : 'Publish Credentials'}
              </button>
            </div>
          </form>
        ) : (
          /* Player Access Card */
          <div className="mt-5 space-y-4">
            {roomId ? (
              <>
                <div className="p-4 rounded-xl bg-slate-950 border border-indigo-500/30 relative overflow-hidden">
                  <div className="absolute top-0 right-0 px-3 py-1 bg-emerald-500/20 text-emerald-300 border-b border-l border-emerald-500/30 rounded-bl-xl text-[10px] font-mono font-bold flex items-center gap-1.5">
                    <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                    <span>LOBBY LIVE</span>
                  </div>

                  <div className="space-y-3 pt-1">
                    <div>
                      <div className="text-[11px] font-semibold text-slate-400 mb-1">ROOM ID / SERVER NAME</div>
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-sm text-cyan-300 font-bold">
                        <span>{roomId}</span>
                        <button
                          onClick={() => handleCopy(roomId, 'room')}
                          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition"
                          title="Copy Room ID"
                        >
                          {copiedField === 'room' ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {password && (
                      <div>
                        <div className="text-[11px] font-semibold text-slate-400 mb-1">ROOM PASSWORD</div>
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-sm text-amber-300 font-bold">
                          <span>{password}</span>
                          <button
                            onClick={() => handleCopy(password, 'pass')}
                            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition"
                            title="Copy Password"
                          >
                            {copiedField === 'pass' ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {instructions && (
                      <div className="mt-2 pt-2 border-t border-slate-800/80">
                        <div className="text-[11px] font-semibold text-slate-400 mb-1">INSTRUCTIONS</div>
                        <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                          {instructions}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 text-amber-300 text-[11px] flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>Do not share room credentials. Unauthorized users will result in immediate disqualification.</span>
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-slate-400 text-sm">
                Room credentials have not yet been published by the match organizer. Please check back 10 minutes prior to match launch.
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={onClose}
                className="px-5 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchRoomCredentialsModal;

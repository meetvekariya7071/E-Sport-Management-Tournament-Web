import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Users,
  User,
  ShieldCheck,
  AlertCircle,
  Copy,
  Check,
  Sparkles,
  KeyRound,
  PlusCircle,
  LogIn,
  CheckCircle2
} from 'lucide-react';
import { tournamentService } from '../services/tournament.service';
import { Tournament } from '../types';
import { useAuth } from '../context/AuthContext';

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: Tournament | null;
  onSuccess: () => void;
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({
  isOpen,
  onClose,
  tournament,
  onSuccess
}) => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Mode tabs for Team Tournaments: 'CREATE' | 'JOIN'
  const [teamMode, setTeamMode] = useState<'CREATE' | 'JOIN'>('CREATE');

  // Solo fields
  const [soloIgn, setSoloIgn] = useState(user?.username || '');

  // Team Create fields
  const [teamName, setTeamName] = useState('');
  const [teamTag, setTeamTag] = useState('');
  const [captainIgn, setCaptainIgn] = useState(user?.username || '');

  // Team Join fields
  const [inviteCode, setInviteCode] = useState('');
  const [memberIgn, setMemberIgn] = useState(user?.username || '');

  // State flags
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    type: 'SOLO' | 'TEAM_CREATED' | 'TEAM_JOINED';
    message: string;
    inviteCode?: string;
    teamName?: string;
  } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen || !tournament) return null;

  const isSolo = tournament.format === 'SOLO';
  const maxRoster = tournament.format === 'DUO' ? 2 : tournament.format === 'SQUAD' ? 4 : 1;

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleSoloSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await tournamentService.registerSolo(tournament.id, soloIgn.trim() || undefined);
      setSuccessData({
        type: 'SOLO',
        message: res.message || 'Successfully registered as solo competitor!'
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Solo registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await tournamentService.createTeam(tournament.id, {
        name: teamName.trim(),
        tag: teamTag.trim() || undefined,
        inGameName: captainIgn.trim() || undefined
      });
      setSuccessData({
        type: 'TEAM_CREATED',
        message: res.message,
        inviteCode: res.team?.inviteCode,
        teamName: res.team?.name
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Team creation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await tournamentService.joinTeamWithInviteCode(tournament.id, {
        inviteCode: inviteCode.trim().toUpperCase(),
        inGameName: memberIgn.trim() || undefined
      });
      setSuccessData({
        type: 'TEAM_JOINED',
        message: res.message,
        teamName: res.team?.name
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to join team.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl p-6 text-slate-100 gaming-card overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none"></div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center space-x-3 text-cyan-400">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/30 shadow-glow-cyan">
              {isSolo ? <User className="w-5 h-5" /> : <Users className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/30 uppercase">
                  {tournament.format} FORMAT
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {tournament.currentCount}/{tournament.maxParticipants} Slots
                </span>
              </div>
              <h3 className="font-heading font-extrabold text-lg text-white">
                {tournament.title}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Not Logged In Banner */}
        {!isAuthenticated && (
          <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700 text-center space-y-4">
            <LogIn className="w-10 h-10 text-cyan-400 mx-auto" />
            <div className="space-y-1">
              <h4 className="font-heading font-bold text-white text-base">Authentication Required</h4>
              <p className="text-xs text-slate-400">
                You must be logged in to register for official competitive tournaments.
              </p>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-black font-heading font-bold text-xs uppercase tracking-wider shadow-glow-cyan"
            >
              Sign In to Register
            </button>
          </div>
        )}

        {/* Logged in flows */}
        {isAuthenticated && (
          <>
            {/* Error Banner */}
            {error && (
              <div className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Success State View */}
            {successData ? (
              <div className="p-6 rounded-2xl bg-slate-800/60 border border-cyan-500/40 text-center space-y-5 animate-fadeIn">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <h4 className="font-heading font-extrabold text-xl text-white">
                    Registration Confirmed!
                  </h4>
                  <p className="text-xs text-slate-300">{successData.message}</p>
                </div>

                {successData.type === 'TEAM_CREATED' && successData.inviteCode && (
                  <div className="p-4 rounded-xl bg-slate-900 border border-cyan-500/30 space-y-2 text-left">
                    <span className="text-[10px] font-mono uppercase text-cyan-400 block font-semibold">
                      Your Team Invite Code (Share with your {tournament.format === 'DUO' ? '1 Partner' : '3 Teammates'})
                    </span>
                    <div className="flex items-center justify-between bg-slate-800/80 px-3 py-2 rounded-lg border border-slate-700">
                      <span className="font-mono text-xl font-bold tracking-widest text-white">
                        {successData.inviteCode}
                      </span>
                      <button
                        onClick={() => handleCopyCode(successData.inviteCode!)}
                        className="px-3 py-1 rounded bg-cyan-400 hover:bg-cyan-300 text-black font-mono text-xs font-bold flex items-center space-x-1.5 transition-colors"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedCode ? 'COPIED' : 'COPY'}</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      Teammates can click &ldquo;Join Team&rdquo; on this tournament and paste this 6-character code to link their account. Roster limit is strictly locked at {maxRoster} players.
                    </p>
                  </div>
                )}

                <div className="pt-2 flex justify-center space-x-3">
                  <button
                    onClick={() => {
                      onClose();
                      navigate('/player');
                    }}
                    className="px-5 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-heading font-bold text-xs uppercase tracking-wider shadow-glow-cyan"
                  >
                    View in My Tournaments
                  </button>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-heading text-xs"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* SOLO REGISTRATION FLOW */}
                {isSolo ? (
                  <form onSubmit={handleSoloSubmit} className="space-y-4">
                    <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 space-y-2">
                      <div className="flex items-center space-x-2 text-cyan-400 font-semibold text-xs font-mono uppercase tracking-wider">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Solo 1v1 Relational Isolation</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        This tournament runs strictly in Solo format. Your individual profile is directly linked to the bracket seed without creating or requiring a Team record.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        In-Game Name / Player ID (IGN)
                      </label>
                      <input
                        type="text"
                        required
                        value={soloIgn}
                        onChange={(e) => setSoloIgn(e.target.value)}
                        placeholder="e.g. ShadowViper#99"
                        className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                      />
                      <span className="text-[11px] text-slate-500 mt-1 block">
                        Displayed in official tournament match sheets & brackets.
                      </span>
                    </div>

                    <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-6 py-2.5 text-xs font-heading font-bold rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-black shadow-glow-cyan uppercase tracking-wider transition-all disabled:opacity-50"
                      >
                        {isSubmitting ? 'Registering...' : 'Confirm Solo Entry'}
                      </button>
                    </div>
                  </form>
                ) : (
                  /* MULTI-PLAYER REGISTRATION FLOW (DUO / SQUAD) */
                  <div className="space-y-4">
                    {/* Mode Toggle Tabs */}
                    <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-800/60 border border-slate-700">
                      <button
                        type="button"
                        onClick={() => {
                          setTeamMode('CREATE');
                          setError(null);
                        }}
                        className={`py-2 px-3 rounded-xl font-heading font-bold text-xs flex items-center justify-center space-x-1.5 transition-all ${
                          teamMode === 'CREATE'
                            ? 'bg-cyan-400 text-black shadow-glow-cyan'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Create Team</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setTeamMode('JOIN');
                          setError(null);
                        }}
                        className={`py-2 px-3 rounded-xl font-heading font-bold text-xs flex items-center justify-center space-x-1.5 transition-all ${
                          teamMode === 'JOIN'
                            ? 'bg-cyan-400 text-black shadow-glow-cyan'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Join Team</span>
                      </button>
                    </div>

                    {/* CREATE TEAM TAB */}
                    {teamMode === 'CREATE' ? (
                      <form onSubmit={handleCreateTeamSubmit} className="space-y-4">
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
                              placeholder="e.g. Shadow Vanguard"
                              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
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
                              onChange={(e) => setTeamTag(e.target.value.toUpperCase())}
                              placeholder="SVG"
                              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 uppercase font-mono"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">
                            Your Captain In-Game ID (IGN)
                          </label>
                          <input
                            type="text"
                            required
                            value={captainIgn}
                            onChange={(e) => setCaptainIgn(e.target.value)}
                            placeholder="Captain IGN"
                            className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                          />
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs text-slate-400 space-y-1">
                          <div className="flex items-center space-x-1.5 text-cyan-400 font-semibold font-mono text-[11px]">
                            <Sparkles className="w-3 h-3" />
                            <span>Unique 6-Character Invite Code Generation</span>
                          </div>
                          <p className="text-[11px] leading-relaxed">
                            Creating the team will claim 1 team slot in the tournament and automatically generate a 6-character invite code. Share the code with your teammates to fill the {maxRoster}-player roster.
                          </p>
                        </div>

                        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                          <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-400 hover:text-white"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-2.5 text-xs font-heading font-bold rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-black shadow-glow-cyan uppercase tracking-wider transition-all disabled:opacity-50"
                          >
                            {isSubmitting ? 'Creating Team...' : 'Create Team & Generate Code'}
                          </button>
                        </div>
                      </form>
                    ) : (
                      /* JOIN TEAM TAB */
                      <form onSubmit={handleJoinTeamSubmit} className="space-y-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">
                            Team Invite Code *
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={6}
                            value={inviteCode}
                            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                            placeholder="e.g. X9K7M2"
                            className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-lg font-mono font-bold tracking-widest text-center text-cyan-400 focus:outline-none focus:border-cyan-500 uppercase"
                          />
                          <span className="text-[11px] text-slate-500 mt-1 block">
                            Ask your team captain for the 6-character code.
                          </span>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">
                            Your In-Game ID (IGN)
                          </label>
                          <input
                            type="text"
                            required
                            value={memberIgn}
                            onChange={(e) => setMemberIgn(e.target.value)}
                            placeholder="Your In-Game Name"
                            className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                          />
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 text-[11px] text-slate-400 space-y-1">
                          <span className="text-cyan-400 font-semibold font-mono block">
                            Strict Roster Capacity Lock
                          </span>
                          <p className="leading-relaxed">
                            {tournament.format === 'DUO'
                              ? 'DUO teams allow a maximum of 2 players (Captain + 1 Partner).'
                              : 'SQUAD teams allow a maximum of 4 players (Captain + 3 Starters).'}
                            {' '}Once the roster is filled, the team is automatically locked against additional entries.
                          </p>
                        </div>

                        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                          <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-400 hover:text-white"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmitting || inviteCode.trim().length === 0}
                            className="px-6 py-2.5 text-xs font-heading font-bold rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-black shadow-glow-cyan uppercase tracking-wider transition-all disabled:opacity-50"
                          >
                            {isSubmitting ? 'Joining...' : 'Join Team Roster'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

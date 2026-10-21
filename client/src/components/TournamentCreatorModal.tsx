import React, { useState, useEffect } from 'react';
import { tournamentService } from '../services/tournament.service';
import { gameService } from '../services/game.service';
import { Game, TournamentFormat } from '../types';
import { validateTournamentDates } from '../utils/tournamentLifecycle';
import {
  X,
  Trophy,
  Gamepad2,
  Calendar,
  Layers,
  Coins,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Check
} from 'lucide-react';

interface TournamentCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const TournamentCreatorModal: React.FC<TournamentCreatorModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [games, setGames] = useState<Game[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);

  // Step 1: General Info
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [gameId, setGameId] = useState('');
  const [bannerImage, setBannerImage] = useState('');
  const [description, setDescription] = useState('');
  const [registrationStartDate, setRegistrationStartDate] = useState('');
  const [registrationEndDate, setRegistrationEndDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Step 2: Format
  const [format, setFormat] = useState<TournamentFormat>('SOLO');
  const [maxParticipants, setMaxParticipants] = useState(16);

  // Step 3: Prize & Structure
  const [prizePool, setPrizePool] = useState('$1,000 USD');
  const [structure, setStructure] = useState('SINGLE_ELIMINATION');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      gameService
        .getAllGames()
        .then((data) => {
          const list = Array.isArray(data) ? data : [];
          setGames(list);
          if (list.length > 0 && !gameId) {
            setGameId(list[0].id);
          }
        })
        .finally(() => setLoadingGames(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedGame = games.find((g) => g.id === gameId);

  const handleNextStep = () => {
    setError(null);
    if (step === 1) {
      if (!title.trim() || !slug.trim() || !gameId) {
        setError('Please complete tournament title, slug, and select a game.');
        return;
      }
      if (!registrationStartDate || !registrationEndDate || !startDate) {
        setError('Registration Start Date, Registration End Date, and Tournament Start Date are mandatory.');
        return;
      }

      // Chronological validation:
      // registrationStartDate < registrationEndDate
      // registrationEndDate <= startDate
      // startDate < endDate
      const dateValidation = validateTournamentDates({
        registrationStartDate,
        registrationEndDate,
        startDate,
        endDate
      });

      if (!dateValidation.valid) {
        setError(dateValidation.error || 'Please correct date sequence.');
        return;
      }

      setStep(2);
    } else if (step === 2) {
      if (selectedGame && !selectedGame.isTeamBased && (format === 'DUO' || format === 'SQUAD')) {
        setError(`"${selectedGame.title}" is designated as a Solo-only game and cannot host ${format} tournaments.`);
        return;
      }

      if (!maxParticipants || Number(maxParticipants) < 2 || Number(maxParticipants) > 256) {
        setError('Maximum slots must be between 2 and 256 participants/teams.');
        return;
      }

      setStep(3);
    }
  };

  const handleCreateTournament = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (step !== 3) {
      handleNextStep();
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await tournamentService.createTournament({
        title,
        slug: slug.toLowerCase().replace(/\s+/g, '-'),
        description,
        bannerImage: bannerImage.trim() || undefined,
        prizePool: prizePool.trim() || undefined,
        structure,
        gameId,
        format,
        maxParticipants: Number(maxParticipants),
        registrationStartDate,
        registrationEndDate,
        startDate,
        endDate: endDate ? endDate : undefined
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to initialize tournament');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-hidden animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[85vh] md:max-h-[88vh] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden gaming-card text-slate-100">
        {/* Sticky Header */}
        <div className="shrink-0 p-5 sm:p-6 border-b border-slate-800 bg-slate-900 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 text-cyan-400">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-extrabold text-xl text-white">
                  TOURNAMENT CREATION ENGINE
                </h3>
                <p className="text-xs text-slate-400">
                  Multi-Step Scoped Tournament Initialization
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step Progress Indicators */}
          <div className="grid grid-cols-3 gap-2 text-xs font-heading font-bold uppercase tracking-wider">
            <div
              className={`p-2 rounded-xl text-center border transition-all ${
                step === 1
                  ? 'bg-cyan-500/10 border-cyan-400 text-cyan-400 shadow-glow-cyan'
                  : step > 1
                  ? 'bg-slate-800/80 border-emerald-500/40 text-emerald-400'
                  : 'bg-slate-900/60 border-slate-800 text-slate-500'
              }`}
            >
              1. General Info
            </div>
            <div
              className={`p-2 rounded-xl text-center border transition-all ${
                step === 2
                  ? 'bg-cyan-500/10 border-cyan-400 text-cyan-400 shadow-glow-cyan'
                  : step > 2
                  ? 'bg-slate-800/80 border-emerald-500/40 text-emerald-400'
                  : 'bg-slate-900/60 border-slate-800 text-slate-500'
              }`}
            >
              2. Format & Bounds
            </div>
            <div
              className={`p-2 rounded-xl text-center border transition-all ${
                step === 3
                  ? 'bg-cyan-500/10 border-cyan-400 text-cyan-400 shadow-glow-cyan'
                  : 'bg-slate-900/60 border-slate-800 text-slate-500'
              }`}
            >
              3. Prize & Structure
            </div>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (step < 3) {
              handleNextStep();
            } else {
              handleCreateTournament(e);
            }
          }}
          className="flex-1 flex flex-col min-h-0 overflow-hidden"
        >
          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* STEP 1: GENERAL INFO */}
            {step === 1 && (
              <div className="space-y-4 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Tournament Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (!slug) setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'));
                    }}
                    placeholder="e.g. Valorant Winter Open Cup"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    URL Slug *
                  </label>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="valorant-winter-open-cup"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Select Game (From Master Catalog) *
                </label>
                <select
                  value={gameId}
                  onChange={(e) => setGameId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                >
                  {games.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title} ({g.genre} • {g.isTeamBased ? 'Team Format' : 'Solo Only'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Banner / Cover Image URL
                </label>
                <input
                  type="url"
                  value={bannerImage}
                  onChange={(e) => setBannerImage(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Registration Window */}
              <div className="p-3 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 space-y-2">
                <div className="flex items-center space-x-2 text-cyan-400 text-xs font-heading font-semibold">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>REGISTRATION WINDOW (COMPULSORY)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                      <span>Registration Start Date *</span>
                      <span className="text-[10px] text-cyan-400 font-mono font-bold">Compulsory</span>
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={registrationStartDate}
                      onChange={(e) => setRegistrationStartDate(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                      <span>Registration End Date *</span>
                      <span className="text-[10px] text-cyan-400 font-mono font-bold">Compulsory</span>
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={registrationEndDate}
                      onChange={(e) => setRegistrationEndDate(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>
              </div>

              {/* Tournament Execution Window */}
              <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-2">
                <div className="flex items-center space-x-2 text-slate-300 text-xs font-heading font-semibold">
                  <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                  <span>TOURNAMENT MATCHES WINDOW</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                      <span>Tournament Start Date *</span>
                      <span className="text-[10px] text-yellow-400 font-mono font-bold">Compulsory</span>
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                      <span>Tournament End Date *</span>
                      <span className="text-[10px] text-slate-400 font-mono">Compulsory or Clearly Marked</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Rules & Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Official code of conduct, lobby guidelines, and map veto process..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 resize-none"
                />
              </div>
            </div>
          )}

          {/* STEP 2: FORMAT & SCOPED RELATIONAL LOGIC */}
          {step === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Tournament Format *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['SOLO', 'DUO', 'SQUAD'] as TournamentFormat[]).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setFormat(fmt)}
                      className={`p-3.5 rounded-2xl border text-center transition-all ${
                        format === fmt
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-glow-cyan'
                          : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className="font-heading font-bold text-sm block">{fmt}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {fmt === 'SOLO' ? '1v1 Competitor' : fmt === 'DUO' ? '2-Player Team' : '4-5 Player Squad'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {format === 'SOLO' ? (
                <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300 space-y-1">
                  <span className="font-mono text-cyan-400 uppercase font-bold text-[11px] block">
                    Solo Dynamic Scoping:
                  </span>
                  <p>
                    Team generation is bypassed. Player records are linked directly to this tournament's
                    participants table with <span className="font-mono text-cyan-400">team_id = null</span>.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-500/30 text-xs text-slate-300 space-y-1">
                  <span className="font-mono text-blue-400 uppercase font-bold text-[11px] block">
                    Team Relational Scoping:
                  </span>
                  <p>
                    Players must register with a designated Team Name, Tag, and validate exact partner roster counts.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Maximum Slots (Participants / Teams) *
                </label>
                <input
                  type="number"
                  min={2}
                  max={256}
                  required
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>
          )}

          {/* STEP 3: PRIZE & STRUCTURE */}
          {step === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Prize Pool Total & Breakdown
                </label>
                <div className="relative">
                  <Coins className="w-4 h-4 text-amber-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={prizePool}
                    onChange={(e) => setPrizePool(e.target.value)}
                    placeholder="e.g. $2,500 USD (1st: $1,500, 2nd: $750, 3rd: $250)"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Bracket Progression Style
                </label>
                <select
                  value={structure}
                  onChange={(e) => setStructure(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="SINGLE_ELIMINATION">Single Elimination (Knockout Bracket)</option>
                  <option value="ROUND_ROBIN">Round Robin (Group Stage Matrix)</option>
                  <option value="LEADERBOARD_POINTS">Points-Based Leaderboard (Placement + Kills)</option>
                </select>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs space-y-1.5">
                <span className="font-heading font-bold text-white text-sm block">Summary Review</span>
                <div className="text-slate-400 grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div>Title: <span className="text-white">{title}</span></div>
                  <div>Format: <span className="text-cyan-400">{format}</span></div>
                  <div>Game: <span className="text-white">{selectedGame?.title}</span></div>
                  <div>Capacity: <span className="text-white">{maxParticipants}</span></div>
                </div>
              </div>
            </div>
          )}

          </div>

          {/* Sticky Footer for Action Buttons */}
          <div className="shrink-0 flex items-center justify-between p-4 sm:p-5 border-t border-slate-800 bg-slate-900/95 backdrop-blur-sm">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStep((prev) => (prev === 3 ? 2 : 1));
                }}
                className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-6 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-heading font-bold text-xs flex items-center gap-2 shadow-glow-cyan transition-all transform hover:-translate-y-0.5 cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-slate-950 font-heading font-bold text-xs flex items-center gap-2 shadow-glow-cyan transition-all disabled:opacity-50 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{isSubmitting ? 'Deploying...' : 'Launch Tournament'}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

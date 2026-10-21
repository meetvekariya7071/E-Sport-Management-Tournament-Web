import React, { useState, useEffect } from 'react';
import { tournamentService } from '../api/tournament.service';
import { gameService } from '../api/game.service';
import { Game, TournamentFormat } from '../types';
import {
  X,
  Trophy,
  Calendar,
  Coins,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Check
} from 'lucide-react';

export interface TournamentCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export type TournamentCreatorModalProps = TournamentCreationModalProps;

export const TournamentCreationModal: React.FC<TournamentCreationModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  // Explicit step state: 1 | 2 | 3
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [games, setGames] = useState<Game[]>([]);
  const [, setLoadingGames] = useState(true);

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

  // Step 2: Format & Bounds
  const [format, setFormat] = useState<TournamentFormat>('SOLO');
  const [maxParticipants, setMaxParticipants] = useState<number | string>(16);

  // Step 3: Prize & Structure
  const [prizePool, setPrizePool] = useState('$1,000 USD');
  const [structure, setStructure] = useState('SINGLE_ELIMINATION');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset step to 1 and clear errors on modal open
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setError(null);
      gameService
        .getAllGames()
        .then((data) => {
          setGames(data);
          if (data.length > 0 && !gameId) {
            setGameId(data[0].id);
          }
        })
        .finally(() => setLoadingGames(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedGame = games.find((g) => g.id === gameId);

  // Step navigation: Next step with validation
  const handleNextStep = (e?: React.MouseEvent | React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    setError(null);

    if (step === 1) {
      if (
        !title.trim() ||
        !slug.trim() ||
        !gameId ||
        !registrationStartDate ||
        !registrationEndDate ||
        !startDate ||
        !endDate
      ) {
        setError('Please complete all compulsory fields in General Info (including all registration & tournament dates).');
        return;
      }

      const regStart = new Date(registrationStartDate).getTime();
      const regEnd = new Date(registrationEndDate).getTime();
      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime();

      if (isNaN(regStart) || isNaN(regEnd) || isNaN(start) || isNaN(end)) {
        setError('Please enter valid dates and times for all schedule fields.');
        return;
      }

      if (regStart >= regEnd) {
        setError('Chronological Error: Registration Start Date must be strictly earlier than Registration End Date.');
        return;
      }

      if (regEnd > start) {
        setError('Chronological Error: Registration End Date must be on or before Tournament Start Date.');
        return;
      }

      if (start >= end) {
        setError('Chronological Error: Tournament Start Date must be strictly earlier than Tournament End Date.');
        return;
      }

      // Transition to Step 2
      setStep(2);
    } else if (step === 2) {
      // Validate bounds: format selection and maximum slots
      if (!format) {
        setError('Please select a valid tournament format (SOLO, DUO, or SQUAD).');
        return;
      }

      const slots = Number(maxParticipants);
      if (isNaN(slots) || slots < 2 || slots > 256) {
        setError('Maximum slots must be between 2 and 256 participants/teams.');
        return;
      }

      if (selectedGame && !selectedGame.isTeamBased && (format === 'DUO' || format === 'SQUAD')) {
        setError(`"${selectedGame.title}" is designated as a Solo-only game and cannot host ${format} tournaments.`);
        return;
      }

      // Explicit transition to Step 3 without calling handleSubmit or API mutation
      setStep(3);
    }
  };

  // Step navigation: Back step without wiping state
  const handlePrevStep = () => {
    setError(null);
    if (step === 3) {
      setStep(2);
    } else if (step === 2) {
      setStep(1);
    }
  };

  // Final submission on Step 3
  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();

    // Guard: Prevent premature submission if triggered before Step 3
    if (step !== 3) {
      handleNextStep(e);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await tournamentService.createTournament({
        title: title.trim(),
        slug: slug.toLowerCase().replace(/\s+/g, '-'),
        description: description.trim(),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl text-slate-100 gaming-card overflow-hidden">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800 p-6 pb-4 flex items-center justify-between shrink-0">
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
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleCreateTournament} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-700">
            {/* Step Progress Indicators */}
            <div className="grid grid-cols-3 gap-2 mb-2 text-xs font-heading font-bold uppercase tracking-wider shrink-0">
              <div
                className={`p-2 rounded-xl text-center border transition-all ${
                  step === 1
                    ? 'bg-cyan-500/10 border-cyan-400 text-cyan-400 shadow-glow-cyan'
                    : step > 1
                    ? 'bg-slate-800/80 border-emerald-500/40 text-emerald-400'
                    : 'bg-slate-900/60 border-slate-800 text-slate-500'
                }`}
              >
                1. GENERAL INFO
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
                2. FORMAT & BOUNDS
              </div>
              <div
                className={`p-2 rounded-xl text-center border transition-all ${
                  step === 3
                    ? 'bg-cyan-500/10 border-cyan-400 text-cyan-400 shadow-glow-cyan'
                    : 'bg-slate-900/60 border-slate-800 text-slate-500'
                }`}
              >
                3. PRIZE & STRUCTURE
              </div>
            </div>

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

                {/* Schedule Matrix: 4 Datetime Pickers */}
                <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <div className="flex items-center space-x-2 text-cyan-400">
                    <Calendar className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-heading font-bold uppercase tracking-wider">
                      Tournament & Registration Timeline
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Registration Start Date * <span className="text-[10px] text-cyan-400">(compulsory)</span>
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
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Registration End Date * <span className="text-[10px] text-cyan-400">(compulsory)</span>
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={registrationEndDate}
                        onChange={(e) => setRegistrationEndDate(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Tournament Start Date * <span className="text-[10px] text-cyan-400">(compulsory)</span>
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
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Tournament End Date * <span className="text-[10px] text-cyan-400">(compulsory)</span>
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between px-1">
                    <span>Chronology Rule: Reg Start &lt; Reg End &le; Tourney Start &lt; Tourney End</span>
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

            {/* STEP 2: FORMAT & BOUNDS */}
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
                    onChange={(e) => setMaxParticipants(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Bounds: Minimum 2, Maximum 256 competitor units.
                  </span>
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

          {/* Sticky Bottom Navigation Controls */}
          <div className="sticky bottom-0 z-10 bg-slate-900 border-t border-slate-800 p-4 sm:px-6 flex items-center justify-between shrink-0">
            {step > 1 ? (
              <button
                type="button"
                onClick={handlePrevStep}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center space-x-1.5 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>&larr; Back</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-5 py-2 text-xs font-heading font-bold rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black shadow-glow-cyan flex items-center space-x-1.5 transition-all"
              >
                <span>Continue &rarr;</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 text-xs font-heading font-bold rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-black shadow-glow-cyan flex items-center space-x-1.5 transition-all disabled:opacity-50"
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

export const TournamentCreatorModal = TournamentCreationModal;
export default TournamentCreationModal;

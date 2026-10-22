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
  Clock,
  Layers,
  Coins,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Check,
  Zap,
  DollarSign
} from 'lucide-react';

export interface TournamentCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  INR: '₹',
  GBP: '£'
};

const PRIZE_DISTRIBUTION_PRESETS = [
  { label: 'Top 3 (50% / 30% / 20%)', value: '1st: 50%, 2nd: 30%, 3rd: 20%' },
  { label: 'Winner Takes All (100%)', value: '1st: 100%' },
  { label: 'Top 4 (40% / 30% / 20% / 10%)', value: '1st: 40%, 2nd: 30%, 3rd: 20%, 4th: 10%' },
  { label: 'Top 2 (70% / 30%)', value: '1st: 70%, 2nd: 30%' },
  { label: 'Custom Distribution', value: 'CUSTOM' }
];

export const TournamentCreationModal: React.FC<TournamentCreationModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  // Explicit Step State Control (1: General Info, 2: Format & Bounds, 3: Prize & Structure)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [games, setGames] = useState<Game[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);

  // Step 1: General Info
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [gameId, setGameId] = useState('');
  const [bannerImage, setBannerImage] = useState('');
  const [description, setDescription] = useState('');

  // Separated Date & Time Inputs with sensible auto-defaults
  // Registration Start
  const [regStartDate, setRegStartDate] = useState('');
  const [regStartTime, setRegStartTime] = useState('09:00');

  // Registration End
  const [regEndDate, setRegEndDate] = useState('');
  const [regEndTime, setRegEndTime] = useState('23:59');

  // Tournament Start
  const [tournStartDate, setTournStartDate] = useState('');
  const [tournStartTime, setTournStartTime] = useState('10:00');

  // Tournament End (Optional)
  const [tournEndDate, setTournEndDate] = useState('');
  const [tournEndTime, setTournEndTime] = useState('22:00');

  // Step 2: Format & Bounds
  const [format, setFormat] = useState<TournamentFormat>('SOLO');
  const [maxParticipants, setMaxParticipants] = useState<number>(16);

  // Step 3: Prize & Structure
  const [prizeAmount, setPrizeAmount] = useState<string>('1000');
  const [currency, setCurrency] = useState<string>('USD');
  const [distributionPreset, setDistributionPreset] = useState<string>('1st: 50%, 2nd: 30%, 3rd: 20%');
  const [customDistribution, setCustomDistribution] = useState<string>('');
  const [structure, setStructure] = useState<string>('SINGLE_ELIMINATION');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to compose ISO-compatible datetime strings
  const buildDateTimeString = (date: string, time: string, fallbackTime: string): string => {
    if (!date) return '';
    const safeTime = (time && time.trim()) ? time.trim() : fallbackTime;
    return `${date}T${safeTime}`;
  };

  // Preset quick-scheduler
  const applyQuickDates = (preset: 'today' | 'tomorrow' | 'weekend') => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === 'today') {
      const regStart = new Date(now);
      const regEnd = new Date(now);
      regEnd.setDate(regEnd.getDate() + 2);
      const tournStart = new Date(regEnd);
      tournStart.setDate(tournStart.getDate() + 1);
      const tournEnd = new Date(tournStart);
      tournEnd.setDate(tournEnd.getDate() + 1);

      setRegStartDate(toYMD(regStart));
      setRegStartTime('09:00');
      setRegEndDate(toYMD(regEnd));
      setRegEndTime('23:59');
      setTournStartDate(toYMD(tournStart));
      setTournStartTime('10:00');
      setTournEndDate(toYMD(tournEnd));
      setTournEndTime('22:00');
    } else if (preset === 'tomorrow') {
      const regStart = new Date(now);
      regStart.setDate(regStart.getDate() + 1);
      const regEnd = new Date(regStart);
      regEnd.setDate(regEnd.getDate() + 3);
      const tournStart = new Date(regEnd);
      tournStart.setDate(tournStart.getDate() + 1);
      const tournEnd = new Date(tournStart);
      tournEnd.setDate(tournEnd.getDate() + 2);

      setRegStartDate(toYMD(regStart));
      setRegStartTime('09:00');
      setRegEndDate(toYMD(regEnd));
      setRegEndTime('23:59');
      setTournStartDate(toYMD(tournStart));
      setTournStartTime('10:00');
      setTournEndDate(toYMD(tournEnd));
      setTournEndTime('22:00');
    } else if (preset === 'weekend') {
      const regStart = new Date(now);
      const regEnd = new Date(now);
      regEnd.setDate(regEnd.getDate() + 5);
      const tournStart = new Date(regEnd);
      tournStart.setDate(tournStart.getDate() + 1);
      const tournEnd = new Date(tournStart);
      tournEnd.setDate(tournEnd.getDate() + 2);

      setRegStartDate(toYMD(regStart));
      setRegStartTime('09:00');
      setRegEndDate(toYMD(regEnd));
      setRegEndTime('23:59');
      setTournStartDate(toYMD(tournStart));
      setTournStartTime('10:00');
      setTournEndDate(toYMD(tournEnd));
      setTournEndTime('22:00');
    }
    setError(null);
  };

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setError(null);

      // Pre-fill default dates (today 09:00 -> 2 days 23:59 -> 3 days 10:00)
      if (!regStartDate) {
        applyQuickDates('today');
      }

      gameService
        .getAllGames(true)
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

  // Step 1 validation
  const handleNextStep1 = () => {
    setError(null);

    if (!title.trim()) {
      setError('Please enter a tournament title.');
      return;
    }
    if (!slug.trim()) {
      setError('Please provide a unique URL slug for the tournament.');
      return;
    }
    if (!gameId) {
      setError('Please select a target game from the master catalog.');
      return;
    }

    if (!regStartDate) {
      setError('Please select complete registration start timeline (Registration Start Date is missing).');
      return;
    }
    if (!regEndDate) {
      setError('Please select complete registration end timeline (Registration End Date is missing).');
      return;
    }
    if (!tournStartDate) {
      setError('Please select tournament execution start timeline (Tournament Start Date is missing).');
      return;
    }

    // Automatically combine date and time (using sensible defaults if time wasn't touched)
    const fullRegStart = buildDateTimeString(regStartDate, regStartTime, '09:00');
    const fullRegEnd = buildDateTimeString(regEndDate, regEndTime, '23:59');
    const fullTournStart = buildDateTimeString(tournStartDate, tournStartTime, '10:00');
    const fullTournEnd = tournEndDate
      ? buildDateTimeString(tournEndDate, tournEndTime, '22:00')
      : undefined;

    // Chronological validation
    const dateValidation = validateTournamentDates({
      registrationStartDate: fullRegStart,
      registrationEndDate: fullRegEnd,
      startDate: fullTournStart,
      endDate: fullTournEnd
    });

    if (!dateValidation.valid) {
      setError(dateValidation.error || 'Please correct tournament date sequence.');
      return;
    }

    // Strictly advance to Step 2
    setCurrentStep(2);
  };

  // Step 2 validation
  const handleNextStep2 = () => {
    setError(null);

    if (!format) {
      setError('Please select a tournament format (SOLO, DUO, or SQUAD).');
      return;
    }

    if (selectedGame && !selectedGame.isTeamBased && (format === 'DUO' || format === 'SQUAD')) {
      setError(
        `"${selectedGame.title}" is designated as a Solo-only game and cannot host ${format} tournaments.`
      );
      return;
    }

    const slots = Number(maxParticipants);
    if (!slots || isNaN(slots) || slots < 2 || slots > 256) {
      setError('Maximum slots capacity must be a valid number between 2 and 256 participants/teams.');
      return;
    }

    // Strictly advance to Step 3 - DO NOT CALL API
    setCurrentStep(3);
  };

  // Step 3 final submission
  const handleFinalSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (currentStep !== 3) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Build final dates
      const fullRegStart = buildDateTimeString(regStartDate, regStartTime, '09:00');
      const fullRegEnd = buildDateTimeString(regEndDate, regEndTime, '23:59');
      const fullTournStart = buildDateTimeString(tournStartDate, tournStartTime, '10:00');
      const fullTournEnd = tournEndDate
        ? buildDateTimeString(tournEndDate, tournEndTime, '22:00')
        : undefined;

      // Construct formatted Prize Pool string within 50 chars
      let formattedPrizePool = '';
      if (prizeAmount && Number(prizeAmount) > 0) {
        const symbol = CURRENCY_SYMBOLS[currency] || '$';
        formattedPrizePool = `${symbol}${Number(prizeAmount).toLocaleString()} ${currency}`;
      }

      await tournamentService.createTournament({
        title: title.trim(),
        slug: slug.toLowerCase().replace(/[^a-z0-9-]+/g, '-'),
        description: description.trim() || undefined,
        bannerImage: bannerImage.trim() || undefined,
        prizePool: formattedPrizePool || undefined,
        structure,
        gameId,
        format,
        maxParticipants: Number(maxParticipants),
        registrationStartDate: fullRegStart,
        registrationEndDate: fullRegEnd,
        startDate: fullTournStart,
        endDate: fullTournEnd
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to initialize tournament');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getEffectiveDistribution = () => {
    if (distributionPreset === 'CUSTOM') {
      return customDistribution.trim() || 'Custom organizer prize breakdown';
    }
    return distributionPreset;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-hidden animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[90vh] md:max-h-[88vh] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        
        {/* Sticky Header */}
        <div className="shrink-0 p-5 sm:p-6 border-b border-slate-800 bg-slate-900 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 text-cyan-400">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 shadow-glow-cyan">
                <Trophy className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="font-heading font-extrabold text-xl text-white tracking-wide">
                  TOURNAMENT CREATION ENGINE
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Multi-Step Scoped Tournament Initialization
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step Progress Indicators */}
          <div className="grid grid-cols-3 gap-2 text-xs font-heading font-bold uppercase tracking-wider">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setCurrentStep(1);
              }}
              className={`p-2.5 rounded-xl text-center border transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                currentStep === 1
                  ? 'bg-cyan-500/10 border-cyan-400 text-cyan-400 shadow-glow-cyan'
                  : currentStep > 1
                  ? 'bg-slate-800/80 border-emerald-500/40 text-emerald-400'
                  : 'bg-slate-900/60 border-slate-800 text-slate-500'
              }`}
            >
              {currentStep > 1 ? <Check className="w-3.5 h-3.5" /> : <span>1.</span>}
              <span>General Info</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (currentStep > 2) {
                  setError(null);
                  setCurrentStep(2);
                } else if (currentStep === 1) {
                  handleNextStep1();
                }
              }}
              className={`p-2.5 rounded-xl text-center border transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                currentStep === 2
                  ? 'bg-cyan-500/10 border-cyan-400 text-cyan-400 shadow-glow-cyan'
                  : currentStep > 2
                  ? 'bg-slate-800/80 border-emerald-500/40 text-emerald-400'
                  : 'bg-slate-900/60 border-slate-800 text-slate-500'
              }`}
            >
              {currentStep > 2 ? <Check className="w-3.5 h-3.5" /> : <span>2.</span>}
              <span>Format & Bounds</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (currentStep === 2) {
                  handleNextStep2();
                }
              }}
              className={`p-2.5 rounded-xl text-center border transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                currentStep === 3
                  ? 'bg-cyan-500/10 border-cyan-400 text-cyan-400 shadow-glow-cyan'
                  : 'bg-slate-900/60 border-slate-800 text-slate-500'
              }`}
            >
              <span>3.</span>
              <span>Prize & Structure</span>
            </button>
          </div>
        </div>

        {/* Modal Form Container with explicit Enter suppression */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (currentStep === 1) handleNextStep1();
            else if (currentStep === 2) handleNextStep2();
            else handleFinalSubmit(e);
          }}
          className="flex-1 flex flex-col min-h-0 overflow-hidden"
        >
          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
            {error && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-start space-x-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* STEP 1: GENERAL INFO */}
            {currentStep === 1 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Tournament Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        if (!slug) {
                          setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                        }
                      }}
                      placeholder="e.g. Apex Legends Champions Cup"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Custom URL Slug *
                    </label>
                    <input
                      type="text"
                      required
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="apex-legends-champions-cup"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Select Game Title *
                    </label>
                    <select
                      value={gameId}
                      onChange={(e) => setGameId(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                      disabled={loadingGames}
                    >
                      {loadingGames ? (
                        <option>Loading games catalogue...</option>
                      ) : (
                        games.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.title} ({g.genre}) - {g.isTeamBased ? 'Team Mode' : 'Solo Mode'}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Banner Image URL (Optional)
                    </label>
                    <input
                      type="url"
                      value={bannerImage}
                      onChange={(e) => setBannerImage(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                {/* Quick Date Presets Bar */}
                <div className="flex items-center justify-between bg-slate-800/40 p-2.5 rounded-xl border border-slate-800 text-xs">
                  <span className="text-slate-400 text-[11px] font-mono flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Quick Timeline Presets:</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => applyQuickDates('today')}
                      className="px-2.5 py-1 text-[11px] font-mono rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:text-white transition-colors cursor-pointer"
                    >
                      3-Day Sprint
                    </button>
                    <button
                      type="button"
                      onClick={() => applyQuickDates('tomorrow')}
                      className="px-2.5 py-1 text-[11px] font-mono rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:text-white transition-colors cursor-pointer"
                    >
                      Starts Tomorrow
                    </button>
                    <button
                      type="button"
                      onClick={() => applyQuickDates('weekend')}
                      className="px-2.5 py-1 text-[11px] font-mono rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:text-white transition-colors cursor-pointer"
                    >
                      Next Weekend
                    </button>
                  </div>
                </div>

                {/* Registration Date Window with Side-by-Side Date & Time */}
                <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-3">
                  <div className="flex items-center justify-between text-slate-300 text-xs font-heading font-semibold">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-cyan-400" />
                      <span>REGISTRATION TIMELINE WINDOW</span>
                    </div>
                    <span className="text-[10px] text-cyan-400 font-mono">Compulsory</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Reg Opens */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-medium text-slate-400">
                        Registration Opens *
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        <input
                          type="date"
                          required
                          value={regStartDate}
                          onChange={(e) => setRegStartDate(e.target.value)}
                          className="col-span-2 bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                        />
                        <div className="relative">
                          <input
                            type="time"
                            value={regStartTime}
                            onChange={(e) => setRegStartTime(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-2 text-xs text-white text-center font-mono focus:outline-none focus:border-cyan-400"
                            title="Start Time (Default 09:00)"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Reg Closes */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-medium text-slate-400">
                        Registration Closes *
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        <input
                          type="date"
                          required
                          value={regEndDate}
                          onChange={(e) => setRegEndDate(e.target.value)}
                          className="col-span-2 bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                        />
                        <div className="relative">
                          <input
                            type="time"
                            value={regEndTime}
                            onChange={(e) => setRegEndTime(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-2 text-xs text-white text-center font-mono focus:outline-none focus:border-cyan-400"
                            title="End Time (Default 23:59)"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tournament Execution Window with Side-by-Side Date & Time */}
                <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-3">
                  <div className="flex items-center justify-between text-slate-300 text-xs font-heading font-semibold">
                    <div className="flex items-center space-x-2">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      <span>TOURNAMENT MATCHES TIMELINE</span>
                    </div>
                    <span className="text-[10px] text-amber-400 font-mono">Tournament Live</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Tourn Start */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-medium text-slate-400">
                        Tournament Kickoff Date *
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        <input
                          type="date"
                          required
                          value={tournStartDate}
                          onChange={(e) => setTournStartDate(e.target.value)}
                          className="col-span-2 bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                        />
                        <input
                          type="time"
                          value={tournStartTime}
                          onChange={(e) => setTournStartTime(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-2 text-xs text-white text-center font-mono focus:outline-none focus:border-cyan-400"
                          title="Kickoff Time (Default 10:00)"
                        />
                      </div>
                    </div>

                    {/* Tourn End (Optional) */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-medium text-slate-400 flex items-center justify-between">
                        <span>Tournament Conclusion</span>
                        <span className="text-[10px] text-slate-500 font-mono">Optional</span>
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        <input
                          type="date"
                          value={tournEndDate}
                          onChange={(e) => setTournEndDate(e.target.value)}
                          className="col-span-2 bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                        />
                        <input
                          type="time"
                          value={tournEndTime}
                          onChange={(e) => setTournEndTime(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-2 text-xs text-white text-center font-mono focus:outline-none focus:border-cyan-400"
                          title="Conclusion Time (Default 22:00)"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Rules & Description (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Official tournament guidelines, match reporting protocol, and server settings..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 resize-none"
                  />
                </div>
              </div>
            )}

            {/* STEP 2: FORMAT & BOUNDS */}
            {currentStep === 2 && (
              <div className="space-y-4 animate-fadeIn">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Tournament Roster Format *
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['SOLO', 'DUO', 'SQUAD'] as TournamentFormat[]).map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setFormat(fmt)}
                        className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                          format === fmt
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-glow-cyan'
                            : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800'
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
                    <p className="text-slate-300 text-xs">
                      Team creation is bypassed. Competitors enroll directly into tournament brackets with{' '}
                      <span className="font-mono text-cyan-400">team_id = null</span>.
                    </p>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-500/30 text-xs text-slate-300 space-y-1">
                    <span className="font-mono text-blue-400 uppercase font-bold text-[11px] block">
                      Team Relational Scoping:
                    </span>
                    <p className="text-slate-300 text-xs">
                      Captains must register a Team Name, Team Tag, and invite roster partners to fulfill the {format} slot capacity.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Maximum Slots (Participants / Teams) *
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={256}
                    required
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
                  />
                  <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                    Supported range: 2 to 256 competitors (e.g. 8, 16, 32, 64).
                  </span>
                </div>
              </div>
            )}

            {/* STEP 3: PRIZE & STRUCTURE */}
            {currentStep === 3 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/30 text-cyan-400">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-sm text-white">Prize Pool & Structure</h4>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Configure tournament financial stakes and bracket elimination progression.
                    </p>
                  </div>
                </div>

                {/* Prize Pool Amount & Currency Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Prize Pool Amount (Total)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono">
                        {CURRENCY_SYMBOLS[currency] || '$'}
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={50}
                        value={prizeAmount}
                        onChange={(e) => setPrizeAmount(e.target.value)}
                        placeholder="5000"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Currency
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="INR">INR (₹)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>
                </div>

                {/* Prize Distribution Structure */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Prize Distribution Structure
                  </label>
                  <select
                    value={distributionPreset}
                    onChange={(e) => setDistributionPreset(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 mb-2"
                  >
                    {PRIZE_DISTRIBUTION_PRESETS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>

                  {distributionPreset === 'CUSTOM' && (
                    <input
                      type="text"
                      value={customDistribution}
                      onChange={(e) => setCustomDistribution(e.target.value)}
                      placeholder="e.g. 1st: $600, 2nd: $300, 3rd: $100"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 animate-fadeIn"
                    />
                  )}
                </div>

                {/* Tournament Bracket / Progression Style */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Tournament Format / Bracket Type *
                  </label>
                  <select
                    value={structure}
                    onChange={(e) => setStructure(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="SINGLE_ELIMINATION">Single Elimination (Knockout Bracket)</option>
                    <option value="DOUBLE_ELIMINATION">Double Elimination (Winners & Losers)</option>
                    <option value="ROUND_ROBIN">Round Robin (Group Stage Matrix)</option>
                    <option value="BATTLE_ROYALE_POINTS">Points-Based Leaderboard (Placement + Kills)</option>
                    <option value="SWISS">Swiss System (Non-elimination rounds)</option>
                  </select>
                </div>

                {/* Final Summary Review Card */}
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs space-y-2">
                  <span className="font-heading font-bold text-white text-xs block text-cyan-400 uppercase tracking-wider">
                    Summary Verification
                  </span>
                  <div className="text-slate-300 grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div>Title: <span className="text-white font-semibold">{title}</span></div>
                    <div>Game: <span className="text-white font-semibold">{selectedGame?.title}</span></div>
                    <div>Format: <span className="text-cyan-400 font-semibold">{format}</span></div>
                    <div>Capacity: <span className="text-white font-semibold">{maxParticipants} Slots</span></div>
                    <div>
                      Prize Pool:{' '}
                      <span className="text-amber-400 font-semibold">
                        {prizeAmount ? `${CURRENCY_SYMBOLS[currency]}${Number(prizeAmount).toLocaleString()} ${currency}` : 'None'}
                      </span>
                    </div>
                    <div>Distribution: <span className="text-slate-300">{getEffectiveDistribution()}</span></div>
                    <div className="col-span-2 text-slate-400 border-t border-slate-800 pt-1.5 mt-1">
                      Timeline: <span className="text-slate-200">{regStartDate || '—'} {regStartTime}</span> → Kickoff: <span className="text-cyan-400">{tournStartDate || '—'} {tournStartTime}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer Controls with Explicit Action Synchronization */}
          <div className="shrink-0 flex items-center justify-between p-4 sm:p-5 border-t border-slate-800 bg-slate-900/95 backdrop-blur-sm">
            {currentStep === 1 && (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleNextStep1}
                  className="px-6 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-heading font-bold text-xs flex items-center gap-2 shadow-glow-cyan transition-all transform hover:-translate-y-0.5 cursor-pointer"
                >
                  <span>Continue →</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {currentStep === 2 && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setCurrentStep(1);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>← Back</span>
                </button>
                <button
                  type="button"
                  onClick={handleNextStep2}
                  className="px-6 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-heading font-bold text-xs flex items-center gap-2 shadow-glow-cyan transition-all transform hover:-translate-y-0.5 cursor-pointer"
                >
                  <span>Continue to Prize & Structure →</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {currentStep === 3 && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setCurrentStep(2);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>← Back</span>
                </button>
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-300 hover:to-sky-400 text-slate-950 font-heading font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? 'Deploying...' : 'Launch Tournament 🚀'}</span>
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

// Aliases for seamless imports across files
export const TournamentCreatorModal = TournamentCreationModal;
export type TournamentCreatorModalProps = TournamentCreationModalProps;
export default TournamentCreationModal;

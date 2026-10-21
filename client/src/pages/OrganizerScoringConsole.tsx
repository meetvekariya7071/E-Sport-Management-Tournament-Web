import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { tournamentService } from '../services/tournament.service';
import { BracketTreeData, BracketRound, BracketMatch } from '../types';
import { useTournamentSocket } from '../hooks/useTournamentSocket';
import {
  Trophy,
  Swords,
  Radio,
  ArrowLeft,
  Save,
  Send,
  Zap,
  CheckCircle2,
  Users,
  AlertCircle,
  Play,
  RotateCcw,
  ExternalLink,
  Target,
  Shield,
  Layers,
  ChevronRight,
  Flame,
  Award
} from 'lucide-react';

interface ScoreEntryRow {
  participantId: string;
  name: string;
  tag?: string | null;
  isTeam?: boolean;
  teamRoster?: string[];
  score: number;
  kills: number;
  placement: number;
  isWinner: boolean;
}

export const OrganizerScoringConsole: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [bracketData, setBracketData] = useState<BracketTreeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Selected Round and Match
  const [selectedRoundIndex, setSelectedRoundIndex] = useState<number>(0);
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');

  // Editable Score Matrix for currently active match or round
  const [editingScores, setEditingScores] = useState<ScoreEntryRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Load Bracket and Fixtures
  const loadConsoleData = useCallback(async (isSilent = false) => {
    if (!id) return;
    try {
      if (!isSilent) setLoading(true);
      setError(null);
      const data = await tournamentService.getBracket(id);
      setBracketData(data);

      // Initialize selected round and match if not set
      if (data.rounds.length > 0) {
        const round = data.rounds[selectedRoundIndex] || data.rounds[0];
        if (round && round.matches.length > 0) {
          const match = round.matches.find((m) => m.id === selectedMatchId) || round.matches[0];
          setSelectedMatchId(match.id);
          populateScoresFromMatch(match);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load tournament scoring console');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [id, selectedRoundIndex, selectedMatchId]);

  useEffect(() => {
    loadConsoleData();
  }, [id]);

  // Real-Time Socket Connection
  const { isConnected, activeAlert } = useTournamentSocket({
    tournamentId: id,
    onScoreUpdate: () => {
      loadConsoleData(true);
    },
    onBracketAdvance: () => {
      loadConsoleData(true);
    }
  });

  const populateScoresFromMatch = (match: BracketMatch) => {
    const rows: ScoreEntryRow[] = match.competitors.map((c, idx) => ({
      participantId: c.participantId,
      name: c.name,
      tag: c.tag,
      isTeam: c.isTeam,
      teamRoster: c.teamRoster,
      score: c.score || 0,
      kills: c.kills || 0,
      placement: c.placement || idx + 1,
      isWinner: c.isWinner || false
    }));
    setEditingScores(rows);
  };

  const handleSelectRound = (idx: number) => {
    if (!bracketData || !bracketData.rounds[idx]) return;
    setSelectedRoundIndex(idx);
    const round = bracketData.rounds[idx];
    if (round.matches.length > 0) {
      const match = round.matches[0];
      setSelectedMatchId(match.id);
      populateScoresFromMatch(match);
    } else {
      setSelectedMatchId('');
      setEditingScores([]);
    }
  };

  const handleSelectMatch = (matchId: string) => {
    if (!bracketData) return;
    const round = bracketData.rounds[selectedRoundIndex];
    const match = round?.matches.find((m) => m.id === matchId);
    if (match) {
      setSelectedMatchId(match.id);
      populateScoresFromMatch(match);
    }
  };

  // Score editing handlers
  const handleScoreChange = (participantId: string, field: keyof ScoreEntryRow, val: any) => {
    setEditingScores((prev) =>
      prev.map((row) => {
        if (row.participantId !== participantId) {
          // If setting isWinner on single elimination match, ensure only one winner
          if (field === 'isWinner' && val === true) {
            return { ...row, isWinner: false };
          }
          return row;
        }
        return { ...row, [field]: val };
      })
    );
  };

  // Generate Bracket Action
  const handleGenerateBracket = async () => {
    if (!id) return;
    try {
      setIsGenerating(true);
      setError(null);
      setActionSuccess(null);
      const res = await tournamentService.generateBracket(id);
      setActionSuccess(res.message || 'Bracket generated and fixtures seeded successfully!');
      await loadConsoleData();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to generate bracket');
    } finally {
      setIsGenerating(false);
    }
  };

  // Bulk Check-in Convenience
  const handleBulkCheckIn = async () => {
    if (!id) return;
    try {
      setIsGenerating(true);
      setError(null);
      const res = await tournamentService.bulkCheckIn(id);
      setActionSuccess(`Check-in complete: ${res.message || 'Checked in all players.'}`);
      await loadConsoleData();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Check-in failed');
    } finally {
      setIsGenerating(false);
    }
  };

  // Save Single Match Score
  const handleSaveMatchScores = async () => {
    if (!id || !selectedMatchId) return;
    try {
      setIsSubmitting(true);
      setError(null);
      setActionSuccess(null);

      const payload = editingScores.map((s) => ({
        participantId: s.participantId,
        score: Number(s.score) || 0,
        kills: Number(s.kills) || 0,
        placement: Number(s.placement) || 1,
        isWinner: Boolean(s.isWinner)
      }));

      await tournamentService.updateMatchScore(id, selectedMatchId, payload);
      setActionSuccess('Match scores submitted and real-time broadcast fired!');
      await loadConsoleData();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to save scores');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 'Publish Round' button: saves data to database and fires WebSocket broadcast simultaneously
  const handlePublishRound = async () => {
    if (!id || !bracketData) return;
    const currentRound = bracketData.rounds[selectedRoundIndex];
    if (!currentRound) return;

    try {
      setIsSubmitting(true);
      setError(null);
      setActionSuccess(null);

      // Build payload for all matches in the round
      const matchScores = currentRound.matches.map((m) => {
        if (m.id === selectedMatchId && editingScores.length > 0) {
          return {
            matchId: m.id,
            scores: editingScores.map((s) => ({
              participantId: s.participantId,
              score: Number(s.score) || 0,
              kills: Number(s.kills) || 0,
              placement: Number(s.placement) || 1,
              isWinner: Boolean(s.isWinner)
            }))
          };
        }
        return {
          matchId: m.id,
          scores: m.competitors.map((c) => ({
            participantId: c.participantId,
            score: c.score || 0,
            kills: c.kills || 0,
            placement: c.placement || 1,
            isWinner: c.isWinner || false
          }))
        };
      });

      const res = await tournamentService.publishRound(id, currentRound.id, matchScores);
      setActionSuccess(res.message || `Round ${currentRound.roundNumber} published and broadcasted live!`);
      await loadConsoleData();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to publish round');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <div className="w-12 h-12 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin mb-4"></div>
        <p className="font-mono text-sm tracking-wider text-slate-400">INITIALIZING SCORING MATRIX...</p>
      </div>
    );
  }

  if (error && !bracketData) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-white mb-2">Scoring Console Error</h2>
          <p className="text-slate-400 text-sm mb-6">{error}</p>
          <Link
            to="/organizer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Workspace
          </Link>
        </div>
      </div>
    );
  }

  const tournament = bracketData?.tournament;
  const rounds = bracketData?.rounds || [];
  const currentRound = rounds[selectedRoundIndex];
  const isSolo = tournament?.format === 'SOLO';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Console Bar */}
      <div className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                to="/organizer"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                    Organizer Scoring Console
                  </span>
                  <span className="text-xs text-slate-400">/</span>
                  <span className="text-xs font-semibold text-slate-400">{tournament?.format}</span>
                </div>
                <h1 className="text-lg sm:text-xl font-black text-white tracking-tight mt-0.5">
                  {tournament?.title}
                </h1>
              </div>
            </div>

            {/* Quick Actions & Live Badge */}
            <div className="flex items-center gap-3 self-end sm:self-auto">
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
                  isConnected
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                }`}
              >
                <Radio className={`w-3.5 h-3.5 ${isConnected ? 'animate-pulse text-emerald-400' : 'text-rose-400'}`} />
                <span>{isConnected ? 'LIVE SYNC ACTIVE' : 'SOCKET OFFLINE'}</span>
              </div>

              <Link
                to={`/tournaments/${tournament?.id}/live`}
                target="_blank"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-all border border-slate-700"
              >
                <span>Live Public View</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Console Container */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Banner Alert Messages */}
        {actionSuccess && (
          <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-sm flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button
              onClick={() => setActionSuccess(null)}
              className="text-emerald-400/60 hover:text-emerald-200 text-sm font-bold ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-sm flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-rose-400/60 hover:text-rose-200 text-sm font-bold ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* If no rounds are generated yet, present Generation Hub */}
        {rounds.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto mb-4">
              <Swords className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white">Generate Tournament Fixtures</h2>
            <p className="text-slate-400 text-sm mt-2 mb-6">
              Auto-seed checked-in players or teams into Round 1 fixtures. Bracket generation
              requires participants to be checked in.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={handleBulkCheckIn}
                disabled={isGenerating}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-sm transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Bulk Check-In All Players</span>
              </button>

              <button
                onClick={handleGenerateBracket}
                disabled={isGenerating}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm transition-all shadow-[0_0_20px_rgba(0,240,255,0.3)] flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-slate-950/20 border-t-slate-950 animate-spin"></div>
                    <span>Generating Fixtures...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Generate & Seed Bracket</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header Controls: Rounds Navigation & Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
              {/* Round Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {rounds.map((round, idx) => (
                  <button
                    key={round.id || idx}
                    onClick={() => handleSelectRound(idx)}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex items-center gap-2 ${
                      selectedRoundIndex === idx
                        ? 'bg-cyan-500 text-slate-950 font-black shadow-[0_0_15px_rgba(0,240,255,0.3)]'
                        : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span>{round.name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        selectedRoundIndex === idx
                          ? 'bg-slate-950/20 text-slate-950'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {round.matches.length}
                    </span>
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-end md:self-auto">
                <button
                  onClick={handleGenerateBracket}
                  disabled={isGenerating}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reseed Fixtures</span>
                </button>

                {/* 'Publish Round' button that saves to database and fires WebSocket broadcast simultaneously */}
                <button
                  onClick={handlePublishRound}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Publish Round Matrix</span>
                </button>
              </div>
            </div>

            {/* Matches in Current Round */}
            {currentRound && (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                {/* Match Selector Sidebar */}
                <div className="lg:col-span-1 space-y-2">
                  <div className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-2 px-1">
                    Fixtures in {currentRound.name}
                  </div>
                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                    {currentRound.matches.map((m) => {
                      const isSelected = selectedMatchId === m.id;
                      const isCompleted = m.status === 'COMPLETED';

                      return (
                        <button
                          key={m.id}
                          onClick={() => handleSelectMatch(m.id)}
                          className={`w-full text-left p-3 rounded-xl border transition-all ${
                            isSelected
                              ? 'border-cyan-400 bg-slate-900 ring-1 ring-cyan-400/40 shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                              : 'border-slate-800/80 bg-slate-900/60 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-1.5">
                            <span>Match #{m.matchNumber}</span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded ${
                                isCompleted
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {m.status}
                            </span>
                          </div>

                          <div className="text-xs text-slate-200 font-semibold space-y-0.5">
                            <div>{m.competitors[0]?.name || 'TBD'}</div>
                            <div className="text-[10px] text-slate-400 font-normal">vs</div>
                            <div>{m.competitors[1]?.name || (m.competitors.length > 2 ? `+${m.competitors.length - 1} Teams` : 'TBD')}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Score Input Matrix (Main Card) */}
                <div className="lg:col-span-3 rounded-2xl border border-slate-800/80 bg-slate-900/70 backdrop-blur-md p-6 shadow-xl space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                    <div>
                      <h3 className="text-lg font-black text-white flex items-center gap-2">
                        <span>Score Entry Matrix</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-cyan-400 border border-cyan-500/20">
                          {isSolo ? 'Solo Participants' : 'Team Rosters'}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Input scores, kills, and placement. Changes will broadcast live to all viewers on publish.
                      </p>
                    </div>

                    <button
                      onClick={handleSaveMatchScores}
                      disabled={isSubmitting || editingScores.length === 0}
                      className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition-all shadow-[0_0_15px_rgba(0,240,255,0.2)] flex items-center gap-1.5 self-start sm:self-auto"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Match Scores</span>
                    </button>
                  </div>

                  {/* Matrix Table */}
                  {editingScores.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-sm">
                      Select a fixture on the left to input scores.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider font-bold text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="py-3 px-4">
                              {isSolo ? 'Player IGN' : 'Team Name & Roster'}
                            </th>
                            <th className="py-3 px-3 text-center w-28">Score / Points</th>
                            <th className="py-3 px-3 text-center w-28">Kills</th>
                            <th className="py-3 px-3 text-center w-28">Placement</th>
                            <th className="py-3 px-4 text-center w-28">Winner Flag</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {editingScores.map((row) => (
                            <tr
                              key={row.participantId}
                              className={`hover:bg-slate-800/40 transition-colors ${
                                row.isWinner ? 'bg-emerald-950/20' : ''
                              }`}
                            >
                              {/* Name / Roster Breakdown */}
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                                      row.isWinner
                                        ? 'bg-emerald-500 text-slate-950'
                                        : 'bg-slate-800 text-slate-200 border border-slate-700'
                                    }`}
                                  >
                                    {row.tag ? row.tag.substring(0, 3) : row.name.substring(0, 2).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-bold text-white text-sm flex items-center gap-2">
                                      <span>{row.name}</span>
                                      {row.tag && (
                                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-cyan-400 font-mono">
                                          [{row.tag}]
                                        </span>
                                      )}
                                    </div>
                                    {/* Duo/Squad individual roster breakdown */}
                                    {!isSolo && row.teamRoster && row.teamRoster.length > 0 && (
                                      <div className="text-[11px] text-slate-400 mt-0.5 flex flex-wrap gap-1">
                                        <span className="text-slate-400">Roster:</span>
                                        {row.teamRoster.map((player, pIdx) => (
                                          <span
                                            key={pIdx}
                                            className="px-1.5 py-0.2 rounded bg-slate-950 text-slate-300 border border-slate-800/60 text-[10px]"
                                          >
                                            {player}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Points / Score Input */}
                              <td className="py-4 px-3 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  value={row.score}
                                  onChange={(e) =>
                                    handleScoreChange(
                                      row.participantId,
                                      'score',
                                      parseInt(e.target.value, 10) || 0
                                    )
                                  }
                                  className="w-20 bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2 text-center text-sm font-mono font-bold text-white focus:outline-none focus:border-cyan-500"
                                />
                              </td>

                              {/* Kills Input */}
                              <td className="py-4 px-3 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  value={row.kills}
                                  onChange={(e) =>
                                    handleScoreChange(
                                      row.participantId,
                                      'kills',
                                      parseInt(e.target.value, 10) || 0
                                    )
                                  }
                                  className="w-20 bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2 text-center text-sm font-mono font-bold text-rose-400 focus:outline-none focus:border-rose-500"
                                />
                              </td>

                              {/* Placement Input */}
                              <td className="py-4 px-3 text-center">
                                <input
                                  type="number"
                                  min="1"
                                  value={row.placement || ''}
                                  onChange={(e) =>
                                    handleScoreChange(
                                      row.participantId,
                                      'placement',
                                      parseInt(e.target.value, 10) || 1
                                    )
                                  }
                                  className="w-20 bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2 text-center text-sm font-mono font-bold text-slate-200 focus:outline-none focus:border-cyan-500"
                                />
                              </td>

                              {/* Winner Flag Toggle */}
                              <td className="py-4 px-4 text-center">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleScoreChange(row.participantId, 'isWinner', !row.isWinner)
                                  }
                                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                    row.isWinner
                                      ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                                      : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                                  }`}
                                >
                                  {row.isWinner ? 'WINNER' : 'LOSS'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
export default OrganizerScoringConsole;

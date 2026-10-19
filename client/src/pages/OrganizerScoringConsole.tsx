import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { tournamentService } from '../api/tournament.service';
import { BracketData, BracketMatch, TournamentDetails } from '../types';
import { BracketVisualizer } from '../components/BracketVisualizer';
import { useTournamentSocket } from '../hooks/useTournamentSocket';
import {
  Trophy,
  ArrowLeft,
  Sparkles,
  Zap,
  Save,
  CheckCircle2,
  AlertCircle,
  Swords,
  Radio,
  Flame,
  Users,
  User,
  Crown
} from 'lucide-react';

export const OrganizerScoringConsole: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [tournament, setTournament] = useState<TournamentDetails | null>(null);
  const [bracket, setBracket] = useState<BracketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Selected match being edited
  const [selectedMatch, setSelectedMatch] = useState<BracketMatch | null>(null);

  // Form score state for selected match: participantId -> { score, kills, placement, isWinner }
  const [scoreInputs, setScoreInputs] = useState<
    Record<
      string,
      {
        score: number;
        kills: number;
        placement?: number | string;
        isWinner: boolean;
      }
    >
  >({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingBracket, setIsGeneratingBracket] = useState(false);

  // Real-time socket integration
  const { isConnected } = useTournamentSocket({
    tournamentId: id,
    onMatchScoreUpdate: () => {
      // Refresh bracket state
      loadBracketData();
    },
    onBracketAdvance: (newBracket) => {
      if (newBracket) setBracket(newBracket);
    }
  });

  const loadBracketData = async () => {
    if (!id) return;
    try {
      const [tData, bData] = await Promise.all([
        tournamentService.getTournamentDetails(id),
        tournamentService.getBracket(id).catch(() => null)
      ]);
      setTournament(tData);
      setBracket(bData);

      // Auto-select first active or scheduled match if none selected
      if (bData && bData.rounds && bData.rounds.length > 0) {
        if (!selectedMatch) {
          const firstRound = bData.rounds[0];
          if (firstRound.matches.length > 0) {
            handleSelectMatch(firstRound.matches[0]);
          }
        } else {
          // Keep selected match updated
          for (const r of bData.rounds) {
            const m = r.matches.find((x: any) => x.id === selectedMatch.id);
            if (m) {
              handleSelectMatch(m);
              break;
            }
          }
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load tournament data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBracketData();
  }, [id]);

  const handleSelectMatch = (match: BracketMatch) => {
    setSelectedMatch(match);
    const initialScores: Record<string, any> = {};
    match.competitors.forEach((c) => {
      initialScores[c.participantId] = {
        score: c.score || 0,
        kills: c.kills || 0,
        placement: c.placement || '',
        isWinner: Boolean(c.isWinner || match.winnerParticipantId === c.participantId)
      };
    });
    setScoreInputs(initialScores);
  };

  const handleScoreChange = (participantId: string, field: string, value: any) => {
    setScoreInputs((prev) => ({
      ...prev,
      [participantId]: {
        ...prev[participantId],
        [field]: value
      }
    }));
  };

  const handleSelectWinner = (participantId: string) => {
    setScoreInputs((prev) => {
      const updated: Record<string, any> = {};
      Object.keys(prev).forEach((pId) => {
        updated[pId] = {
          ...prev[pId],
          isWinner: pId === participantId
        };
      });
      return updated;
    });
  };

  const handlePublishScores = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !selectedMatch) return;

    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const scoresPayload = Object.keys(scoreInputs).map((pId) => ({
        participantId: pId,
        score: Number(scoreInputs[pId].score || 0),
        kills: Number(scoreInputs[pId].kills || 0),
        placement: scoreInputs[pId].placement ? Number(scoreInputs[pId].placement) : undefined,
        isWinner: Boolean(scoreInputs[pId].isWinner)
      }));

      await tournamentService.updateMatchScore(id, selectedMatch.id, {
        scores: scoresPayload,
        status: 'COMPLETED'
      });

      setSuccessMsg('Match scores published & bracket advanced in real-time!');
      await loadBracketData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to publish match scores.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateBracket = async () => {
    if (!id) return;
    if (
      !window.confirm(
        'Generate and seed the tournament bracket now? Any existing match scores will be reset.'
      )
    )
      return;

    setIsGeneratingBracket(true);
    setError(null);
    try {
      const res = await tournamentService.generateBracket(id);
      setSuccessMsg(res.message || 'Bracket generated and seeded successfully!');
      await loadBracketData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to generate bracket.');
    } finally {
      setIsGeneratingBracket(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-24 text-slate-500 space-y-3">
        <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="font-mono text-xs">Opening scoring console...</p>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="text-center py-20 space-y-4">
        <div className="text-red-400 font-bold">Tournament Not Found</div>
        <Link to="/organizer" className="text-cyan-400 text-xs hover:underline">
          &larr; Return to Organizer Dashboard
        </Link>
      </div>
    );
  }

  const isSolo = tournament.format === 'SOLO';

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto py-6 px-4">
      {/* Top Breadcrumb & Live Socket Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to={`/organizer/tournaments/${tournament.id}/database`}
          className="text-xs font-mono text-cyan-400 hover:underline inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Scoped Database
        </Link>

        <div className="flex items-center space-x-3">
          {/* Socket Indicator */}
          <div className="px-3 py-1 rounded-full bg-slate-900 border border-slate-700 flex items-center space-x-2 text-xs font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
              }`}
            ></span>
            <span className={isConnected ? 'text-emerald-400' : 'text-slate-500'}>
              {isConnected ? 'WEBSOCKET BROADCASTER ACTIVE' : 'RECONNECTING...'}
            </span>
          </div>

          <Link
            to={`/tournaments/${tournament.id}/live`}
            target="_blank"
            className="px-3 py-1 rounded-xl bg-cyan-400/10 hover:bg-cyan-400/20 text-cyan-400 border border-cyan-500/30 text-xs font-heading font-bold"
          >
            Open Live Spectator View &rarr;
          </Link>
        </div>
      </div>

      {/* Header Banner */}
      <div className="gaming-card rounded-3xl p-6 sm:p-8 border border-slate-800 bg-gradient-to-r from-slate-900 via-gaming-card to-slate-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-bold uppercase">
              {tournament.format}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30 uppercase">
              {tournament.structure?.replace('_', ' ')}
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {tournament.currentCount} Registered
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-white">
            SCORING & BRACKET CONSOLE: <span className="text-cyan-400">{tournament.title}</span>
          </h1>

          <p className="text-xs text-slate-400 max-w-xl">
            Input match points, kills, and winner advancements. Published scores are immediately broadcast to all spectators and participants in real-time.
          </p>
        </div>

        {/* Generate Bracket Action Button */}
        <div className="shrink-0 space-y-2 text-right w-full sm:w-auto">
          <button
            onClick={handleGenerateBracket}
            disabled={isGeneratingBracket}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-black font-heading font-bold text-xs uppercase tracking-wider shadow-glow-cyan transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            <Zap className="w-4 h-4" />
            <span>{bracket ? 'Re-Seed Bracket' : 'Generate & Seed Bracket'}</span>
          </button>
          <span className="text-[10px] font-mono text-slate-500 block text-center sm:text-right">
            Random power-of-2 seed placement
          </span>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Scoring Input Console & Selected Match Box */}
      {selectedMatch ? (
        <div className="gaming-card rounded-2xl border border-cyan-500/40 p-6 space-y-5 shadow-glow-cyan bg-slate-900/95">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-400/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 font-bold font-mono text-xs">
                M{selectedMatch.matchNumber}
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-white">
                  Match Scoring Input Console
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  Status: <strong className="text-cyan-400 uppercase">{selectedMatch.status}</strong>
                </span>
              </div>
            </div>

            <div className="text-xs font-mono text-slate-400">
              Select Winner to Auto-Advance Bracket Node
            </div>
          </div>

          <form onSubmit={handlePublishScores} className="space-y-5">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-[10px] font-mono uppercase text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Competitor</th>
                    <th className="py-2.5 px-3 text-center w-28">Score / Points</th>
                    <th className="py-2.5 px-3 text-center w-24">Kills</th>
                    <th className="py-2.5 px-3 text-center w-24">Placement</th>
                    <th className="py-2.5 px-3 text-center w-36">Winner Advance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {selectedMatch.competitors.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500 font-mono">
                        No competitors currently seeded in this match fixture.
                      </td>
                    </tr>
                  ) : (
                    selectedMatch.competitors.map((comp) => {
                      const input = scoreInputs[comp.participantId] || {
                        score: comp.score,
                        kills: comp.kills,
                        placement: comp.placement,
                        isWinner: comp.isWinner
                      };

                      return (
                        <tr
                          key={comp.participantId}
                          className={`hover:bg-slate-800/40 transition-colors ${
                            input.isWinner ? 'bg-cyan-950/30' : ''
                          }`}
                        >
                          <td className="py-3 px-3">
                            <div className="flex items-center space-x-2">
                              <div
                                className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold ${
                                  input.isWinner
                                    ? 'bg-cyan-400 text-black'
                                    : 'bg-slate-800 text-slate-300'
                                }`}
                              >
                                {isSolo ? <User className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                              </div>
                              <div>
                                <span className="font-heading font-bold text-white text-sm block">
                                  {comp.name}
                                </span>
                                {comp.tag && (
                                  <span className="text-[10px] font-mono text-cyan-400">
                                    [{comp.tag}]
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Score Input */}
                          <td className="py-3 px-3 text-center">
                            <input
                              type="number"
                              min={0}
                              value={input.score}
                              onChange={(e) =>
                                handleScoreChange(comp.participantId, 'score', e.target.value)
                              }
                              className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-center font-mono font-bold text-sm text-white focus:outline-none focus:border-cyan-500"
                            />
                          </td>

                          {/* Kills Input */}
                          <td className="py-3 px-3 text-center">
                            <input
                              type="number"
                              min={0}
                              value={input.kills}
                              onChange={(e) =>
                                handleScoreChange(comp.participantId, 'kills', e.target.value)
                              }
                              className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono text-xs text-amber-400 focus:outline-none focus:border-cyan-500"
                            />
                          </td>

                          {/* Placement Input */}
                          <td className="py-3 px-3 text-center">
                            <input
                              type="number"
                              min={1}
                              value={input.placement || ''}
                              placeholder="Rank"
                              onChange={(e) =>
                                handleScoreChange(comp.participantId, 'placement', e.target.value)
                              }
                              className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                            />
                          </td>

                          {/* Winner Flag Toggle */}
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleSelectWinner(comp.participantId)}
                              className={`px-3 py-1 rounded-lg text-xs font-heading font-bold flex items-center justify-center space-x-1.5 mx-auto transition-all ${
                                input.isWinner
                                  ? 'bg-cyan-400 text-black shadow-glow-cyan'
                                  : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                              }`}
                            >
                              <Crown className="w-3.5 h-3.5" />
                              <span>{input.isWinner ? 'WINNER ★' : 'Mark Winner'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                type="submit"
                disabled={isSubmitting || selectedMatch.competitors.length === 0}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-black font-heading font-bold text-xs uppercase tracking-wider shadow-glow-cyan flex items-center space-x-2 transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSubmitting ? 'Publishing...' : 'Publish Match & Advance Winner'}</span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-400">
          Click any match fixture below to load the score input matrix.
        </div>
      )}

      {/* Visual Bracket Matrix Tree */}
      <div className="space-y-4">
        <h3 className="font-heading font-bold text-lg text-white flex items-center gap-2">
          <Swords className="w-5 h-5 text-cyan-400" />
          Interactive Tournament Tree (Click to Score)
        </h3>

        <BracketVisualizer
          bracket={bracket}
          onSelectMatch={handleSelectMatch}
          selectedMatchId={selectedMatch?.id}
          isInteractive={true}
        />
      </div>
    </div>
  );
};

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { tournamentService } from '../services/tournament.service';
import { BracketTreeData, BracketRound, LeaderboardStanding } from '../types';
import { BracketVisualizer } from '../components/BracketVisualizer';
import { LiveLeaderboard } from '../components/LiveLeaderboard';
import { useTournamentSocket } from '../hooks/useTournamentSocket';
import { useAuth } from '../context/AuthContext';
import {
  Trophy,
  Swords,
  Radio,
  ArrowLeft,
  Calendar,
  Gamepad2,
  RefreshCw,
  Zap,
  Shield,
  Layers,
  ChevronRight,
  Flame,
  Award
} from 'lucide-react';

export const LiveTournamentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [bracketData, setBracketData] = useState<BracketTreeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'bracket' | 'leaderboard'>('bracket');
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  // Load Initial Data
  const loadBracketData = useCallback(async (isSilent = false) => {
    if (!id) return;
    try {
      if (!isSilent) setLoading(true);
      setError(null);
      const data = await tournamentService.getBracket(id);
      setBracketData(data);
      setLastRefreshedAt(new Date());

      // If Leaderboard format, default tab to leaderboard
      if (data.tournament.structure === 'LEADERBOARD_POINTS' && !isSilent) {
        setActiveTab('leaderboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load tournament live bracket');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadBracketData();
  }, [loadBracketData]);

  // Real-Time Socket.io Integration
  const { isConnected, lastEventTime, activeAlert, clearAlert } = useTournamentSocket({
    tournamentId: id,
    onScoreUpdate: (event) => {
      // Smoothly refresh bracket data without full loading flicker
      loadBracketData(true);
    },
    onBracketAdvance: (event) => {
      // Re-fetch bracket tree to update advancing competitor positions
      loadBracketData(true);
    },
    onLeaderboardRefresh: (event) => {
      if (bracketData && event.standings) {
        setBracketData((prev) => (prev ? { ...prev, standings: event.standings } : null));
      } else {
        loadBracketData(true);
      }
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin"></div>
          <Swords className="w-6 h-6 text-cyan-400 absolute inset-0 m-auto" />
        </div>
        <p className="mt-4 font-mono text-sm tracking-wider text-slate-400">CONNECTING TO LIVE ARENA...</p>
      </div>
    );
  }

  if (error || !bracketData) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Live Tournament Unavailable</h2>
          <p className="text-slate-400 text-sm mb-6">{error || 'Tournament not found'}</p>
          <Link
            to="/tournaments"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Tournaments
          </Link>
        </div>
      </div>
    );
  }

  const { tournament, rounds, standings } = bracketData;
  const isPointsFormat = tournament.structure === 'LEADERBOARD_POINTS';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-slate-950">
      {/* Real-time floating alert */}
      {activeAlert && (
        <div className="fixed top-20 right-6 z-50 animate-bounce">
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-cyan-950/90 border border-cyan-400/50 text-cyan-200 shadow-[0_0_20px_rgba(0,240,255,0.3)] backdrop-blur-md">
            <Zap className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="text-xs font-bold">{activeAlert}</span>
            <button
              onClick={clearAlert}
              className="text-cyan-400/60 hover:text-cyan-200 text-xs ml-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Top Banner / Hero */}
      <div className="relative border-b border-slate-800/80 bg-gradient-to-b from-slate-900 via-slate-900/60 to-slate-950 overflow-hidden">
        {/* Glow backdrop accent */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -top-12 left-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6 relative z-10">
          {/* Breadcrumb & Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <Link to="/tournaments" className="hover:text-cyan-400 transition-colors">
                Tournaments
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <Link to={`/tournaments/${tournament.id}`} className="hover:text-cyan-400 transition-colors truncate max-w-[200px]">
                {tournament.title}
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-cyan-400 font-semibold">Live Center</span>
            </div>

            {/* Socket Status Indicator */}
            <div className="flex items-center gap-3">
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                  isConnected
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                    : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                }`}
              >
                <Radio className={`w-3.5 h-3.5 ${isConnected ? 'animate-pulse text-emerald-400' : 'text-rose-400'}`} />
                <span>{isConnected ? 'LIVE SYNC ACTIVE' : 'RECONNECTING...'}</span>
              </div>

              <button
                onClick={() => loadBracketData(false)}
                title="Manual refresh"
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tournament Headline */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-2">
                <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-black uppercase tracking-wider">
                  {tournament.game?.title || 'Esports Arena'}
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold">
                  {tournament.format} Tournament
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
                  {isPointsFormat ? 'Points Leaderboard' : 'Single Elimination'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                {tournament.title}
              </h1>
            </div>

            {/* Prize & Status Stat Widget */}
            <div className="flex items-center gap-4 self-start lg:self-auto">
              {tournament.prizePool && (
                <div className="px-4 py-3 rounded-2xl bg-gradient-to-br from-amber-500/10 to-slate-900 border border-amber-500/30 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                      Prize Pool
                    </span>
                    <span className="text-lg font-black text-amber-300 font-mono">
                      {tournament.prizePool}
                    </span>
                  </div>
                </div>
              )}

              <Link
                to={`/tournaments/${tournament.id}`}
                className="px-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-2"
              >
                <span>Tournament Details</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Navigation Tabs (Bracket vs Leaderboard) */}
          <div className="flex items-center gap-2 mt-8 border-b border-slate-800">
            <button
              onClick={() => setActiveTab('bracket')}
              className={`flex items-center gap-2 px-5 py-3 font-bold text-sm border-b-2 transition-all ${
                activeTab === 'bracket'
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Swords className="w-4 h-4" />
              <span>Interactive Bracket</span>
              {rounds.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">
                  {rounds.length} Rounds
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`flex items-center gap-2 px-5 py-3 font-bold text-sm border-b-2 transition-all ${
                activeTab === 'leaderboard'
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>Live Standings</span>
              {standings.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">
                  {standings.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Arena */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'bracket' ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between text-xs text-slate-400 pb-2">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                Scores update live automatically across participants.
              </span>
              <span>Updated: {lastRefreshedAt.toLocaleTimeString()}</span>
            </div>

            <BracketVisualizer
              rounds={rounds}
              structure={tournament.structure}
              tournamentId={tournament.id}
              isOrganizerOrAdmin={user?.role === 'ADMIN' || tournament.organizer?.id === user?.id}
              onBracketRefreshNeeded={() => loadBracketData(true)}
            />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between text-xs text-slate-400 pb-2">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                Standings aggregate kill points & match rank placement in real time.
              </span>
              <span>Updated: {lastRefreshedAt.toLocaleTimeString()}</span>
            </div>

            <LiveLeaderboard
              standings={standings}
              structure={tournament.structure}
              tournamentId={tournament.id}
              tieBreakerRules={tournament.tieBreakerRules}
              isOrganizerOrAdmin={user?.role === 'ADMIN' || tournament.organizer?.id === user?.id}
              onRulesUpdated={() => loadBracketData(true)}
            />
          </div>
        )}
      </div>
    </div>
  );
};
export default LiveTournamentPage;

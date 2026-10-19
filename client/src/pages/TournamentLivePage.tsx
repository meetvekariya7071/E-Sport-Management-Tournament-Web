import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { tournamentService } from '../api/tournament.service';
import { BracketData, LeaderboardRow, TournamentDetails } from '../types';
import { BracketVisualizer } from '../components/BracketVisualizer';
import { LiveLeaderboard } from '../components/LiveLeaderboard';
import { useTournamentSocket } from '../hooks/useTournamentSocket';
import {
  Trophy,
  ArrowLeft,
  Flame,
  Gamepad2,
  Calendar,
  Swords,
  Radio,
  Clock,
  Sparkles,
  Users
} from 'lucide-react';

export const TournamentLivePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [tournament, setTournament] = useState<TournamentDetails | null>(null);
  const [bracket, setBracket] = useState<BracketData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active Live View Tab: 'BRACKET' | 'LEADERBOARD'
  const [activeTab, setActiveTab] = useState<'BRACKET' | 'LEADERBOARD'>('BRACKET');

  // Real-time flash notification banner for live updates
  const [liveUpdateAlert, setLiveUpdateAlert] = useState<string | null>(null);

  const triggerLiveFlash = (message: string) => {
    setLiveUpdateAlert(message);
    setTimeout(() => setLiveUpdateAlert(null), 3500);
  };

  // Real-time Socket.io listener
  const { isConnected } = useTournamentSocket({
    tournamentId: id,
    onMatchScoreUpdate: (matchData) => {
      triggerLiveFlash(`Score Updated: Match ${matchData.matchNumber || ''} scores refreshed!`);
      // Reload live data
      fetchLiveData();
    },
    onBracketAdvance: (newBracket) => {
      triggerLiveFlash('Bracket Advanced: Winner progressed to next round!');
      if (newBracket) setBracket(newBracket);
    },
    onLeaderboardRefresh: (newLeaderboard) => {
      triggerLiveFlash('Leaderboard Updated: Standings recalculated in real-time!');
      if (newLeaderboard) setLeaderboard(newLeaderboard);
    }
  });

  const fetchLiveData = async () => {
    if (!id) return;
    try {
      const [tData, bData, lData] = await Promise.all([
        tournamentService.getTournamentDetails(id),
        tournamentService.getBracket(id).catch(() => null),
        tournamentService.getLeaderboard(id).catch(() => [])
      ]);
      setTournament(tData);
      setBracket(bData);
      setLeaderboard(lData || []);

      // If Battle Royale / Leaderboard format, default tab to Leaderboard
      if (tData?.structure === 'LEADERBOARD_POINTS') {
        setActiveTab('LEADERBOARD');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load live tournament view.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveData();
  }, [id]);

  if (loading) {
    return (
      <div className="text-center py-24 text-slate-500 space-y-3">
        <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="font-mono text-xs">Connecting to live tournament room...</p>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="text-center py-20 space-y-4">
        <div className="text-red-400 font-bold">{error || 'Tournament Not Found'}</div>
        <Link to="/tournaments" className="text-cyan-400 text-xs hover:underline">
          &larr; Return to Tournament Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto py-8 px-4">
      {/* Top Header & Live Pulse Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to={`/tournaments/${tournament.id}`}
          className="text-xs font-mono text-cyan-400 hover:underline inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to tournament overview
        </Link>

        {/* Live Socket Status Badge */}
        <div className="flex items-center space-x-3">
          <div className="px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-700 flex items-center space-x-2 text-xs font-mono shadow-glow-cyan">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isConnected ? 'bg-emerald-400 animate-ping' : 'bg-red-400'
              }`}
            ></span>
            <span
              className={`font-bold ${
                isConnected ? 'text-emerald-400' : 'text-slate-500'
              }`}
            >
              {isConnected ? 'LIVE WEBSOCKET STREAM CONNECTED' : 'CONNECTING TO ROOM...'}
            </span>
          </div>
        </div>
      </div>

      {/* Live Flash Alert Banner */}
      {liveUpdateAlert && (
        <div className="p-3.5 rounded-2xl bg-cyan-500/20 border border-cyan-400 text-cyan-300 font-heading font-bold text-xs flex items-center justify-center space-x-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>{liveUpdateAlert}</span>
        </div>
      )}

      {/* Tournament Live Header Card */}
      <div className="gaming-card rounded-3xl p-6 sm:p-8 border border-cyan-500/30 bg-gradient-to-r from-slate-900 via-gaming-card to-slate-950 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 uppercase">
              {tournament.format} FORMAT
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase flex items-center gap-1">
              <Radio className="w-3 h-3 animate-pulse" /> LIVE STREAM
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-purple-500/10 text-purple-400 border border-purple-500/30 uppercase">
              {tournament.structure?.replace('_', ' ')}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-heading font-extrabold text-white">
            {tournament.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
            <span className="flex items-center gap-1.5 font-semibold">
              <Gamepad2 className="w-4 h-4 text-cyan-400" />
              {tournament.game?.title}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <Calendar className="w-4 h-4 text-slate-500" />
              {new Date(tournament.startDate).toLocaleDateString()}
            </span>
            {tournament.prizePool && (
              <>
                <span>•</span>
                <span className="text-emerald-400 font-mono font-bold flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5" /> Prize Pool: {tournament.prizePool}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Live View Controls Tabs */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-800/80 border border-slate-700 shrink-0">
          <button
            onClick={() => setActiveTab('BRACKET')}
            className={`px-4 py-2 rounded-xl text-xs font-heading font-bold flex items-center space-x-1.5 transition-all ${
              activeTab === 'BRACKET'
                ? 'bg-cyan-400 text-black shadow-glow-cyan'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Swords className="w-4 h-4" />
            <span>Bracket Tree</span>
          </button>

          <button
            onClick={() => setActiveTab('LEADERBOARD')}
            className={`px-4 py-2 rounded-xl text-xs font-heading font-bold flex items-center space-x-1.5 transition-all ${
              activeTab === 'LEADERBOARD'
                ? 'bg-cyan-400 text-black shadow-glow-cyan'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Live Standings</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'BRACKET' ? (
        <div className="space-y-4">
          <BracketVisualizer bracket={bracket} isInteractive={false} />
        </div>
      ) : (
        <div className="space-y-4">
          <LiveLeaderboard rows={leaderboard} format={tournament.format} />
        </div>
      )}
    </div>
  );
};

import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { BracketRound, LeaderboardStanding } from '../types';

export interface ScoreUpdateEvent {
  tournamentId: string;
  matchId: string;
  roundId?: string;
  scores: Array<{
    participantId: string;
    score: number;
    kills?: number;
    placement?: number;
    isWinner?: boolean;
  }>;
  status?: string;
  timestamp: string;
}

export interface BracketAdvanceEvent {
  tournamentId: string;
  sourceMatchId: string;
  winnerParticipantId: string;
  winnerName: string;
  nextMatchId: string;
  nextMatchSlot?: number;
  targetRoundNumber: number;
  timestamp: string;
}

export interface LeaderboardRefreshEvent {
  tournamentId: string;
  standings: LeaderboardStanding[];
  roundNumber?: number;
  timestamp: string;
}

interface UseTournamentSocketOptions {
  tournamentId?: string;
  onScoreUpdate?: (event: ScoreUpdateEvent) => void;
  onBracketAdvance?: (event: BracketAdvanceEvent) => void;
  onLeaderboardRefresh?: (event: LeaderboardRefreshEvent) => void;
}

export const useTournamentSocket = ({
  tournamentId,
  onScoreUpdate,
  onBracketAdvance,
  onLeaderboardRefresh
}: UseTournamentSocketOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEventTime, setLastEventTime] = useState<string | null>(null);
  const [activeAlert, setActiveAlert] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Keep latest callbacks in ref to avoid stale closures
  const callbacksRef = useRef({
    onScoreUpdate,
    onBracketAdvance,
    onLeaderboardRefresh
  });

  useEffect(() => {
    callbacksRef.current = {
      onScoreUpdate,
      onBracketAdvance,
      onLeaderboardRefresh
    };
  });

  const clearAlert = useCallback(() => {
    setActiveAlert(null);
  }, []);

  useEffect(() => {
    if (!tournamentId) return;

    // Use current origin if proxied through Vite, fallback to port 5000
    const socketUrl =
      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:5000'
        : window.location.origin;

    const socket: Socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      // console.log(`[WebSocket] Connected with ID: ${socket.id}`);
      setIsConnected(true);
      // Join scoped tournament room
      socket.emit('join:tournament', tournamentId);
    });

    socket.on('disconnect', () => {
      // console.log('[WebSocket] Disconnected from server');
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('[WebSocket] Connection warning:', err.message);
      setIsConnected(false);
    });

    // Event 1: Match Score Update
    socket.on('match:update_score', (data: ScoreUpdateEvent) => {
      // console.log('[WebSocket] match:update_score received:', data);
      setLastEventTime(data.timestamp || new Date().toISOString());
      setActiveAlert('Match scores updated live');
      if (callbacksRef.current.onScoreUpdate) {
        callbacksRef.current.onScoreUpdate(data);
      }
      setTimeout(() => setActiveAlert(null), 4000);
    });

    // Event 2: Bracket Advance
    socket.on('bracket:advance', (data: BracketAdvanceEvent) => {
      // console.log('[WebSocket] bracket:advance received:', data);
      setLastEventTime(data.timestamp || new Date().toISOString());
      setActiveAlert(`⚡ ${data.winnerName} advanced to Round ${data.targetRoundNumber}!`);
      if (callbacksRef.current.onBracketAdvance) {
        callbacksRef.current.onBracketAdvance(data);
      }
      setTimeout(() => setActiveAlert(null), 5000);
    });

    // Event 3: Leaderboard Refresh
    socket.on('leaderboard:refresh', (data: LeaderboardRefreshEvent) => {
      // console.log('[WebSocket] leaderboard:refresh received:', data);
      setLastEventTime(data.timestamp || new Date().toISOString());
      if (callbacksRef.current.onLeaderboardRefresh) {
        callbacksRef.current.onLeaderboardRefresh(data);
      }
    });

    // Cleanup on unmount or tournamentId change
    return () => {
      if (socket) {
        socket.emit('leave:tournament', tournamentId);
        socket.disconnect();
      }
    };
  }, [tournamentId]);

  return {
    isConnected,
    lastEventTime,
    activeAlert,
    clearAlert
  };
};

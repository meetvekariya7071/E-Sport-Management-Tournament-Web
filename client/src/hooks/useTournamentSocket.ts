import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseTournamentSocketOptions {
  tournamentId?: string;
  onMatchScoreUpdate?: (data: any) => void;
  onBracketAdvance?: (data: any) => void;
  onLeaderboardRefresh?: (data: any) => void;
}

export const useTournamentSocket = ({
  tournamentId,
  onMatchScoreUpdate,
  onBracketAdvance,
  onLeaderboardRefresh
}: UseTournamentSocketOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Keep callback refs fresh
  const onScoreRef = useRef(onMatchScoreUpdate);
  const onBracketRef = useRef(onBracketAdvance);
  const onLeaderboardRef = useRef(onLeaderboardRefresh);

  useEffect(() => {
    onScoreRef.current = onMatchScoreUpdate;
    onBracketRef.current = onBracketAdvance;
    onLeaderboardRef.current = onLeaderboardRefresh;
  });

  useEffect(() => {
    if (!tournamentId) return;

    // Connect to backend server on port 5000
    const socketUrl =
      window.location.hostname === 'localhost'
        ? 'http://localhost:5000'
        : window.location.origin;

    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      // Join scoped tournament room
      socket.emit('join_tournament', tournamentId);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('match:update_score', (data: any) => {
      if (onScoreRef.current) {
        onScoreRef.current(data);
      }
    });

    socket.on('bracket:advance', (data: any) => {
      if (onBracketRef.current) {
        onBracketRef.current(data);
      }
    });

    socket.on('leaderboard:refresh', (data: any) => {
      if (onLeaderboardRef.current) {
        onLeaderboardRef.current(data);
      }
    });

    return () => {
      socket.emit('leave_tournament', tournamentId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [tournamentId]);

  return { isConnected, socket: socketRef.current };
};

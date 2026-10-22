import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';

let io: SocketIOServer | null = null;

export const initSocketServer = (httpServer: HttpServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
    }
  });

  io.on('connection', (socket: Socket) => {
    // console.log(`[Socket.io] Client connected: ${socket.id}`);

    // Join tournament scoped room
    socket.on('join:tournament', (tournamentId: string) => {
      if (!tournamentId) return;
      const room = `tournament:${tournamentId}`;
      socket.join(room);
      // console.log(`[Socket.io] Socket ${socket.id} joined room ${room}`);
      socket.emit('joined:tournament', { tournamentId, room });
    });

    // Leave tournament scoped room
    socket.on('leave:tournament', (tournamentId: string) => {
      if (!tournamentId) return;
      const room = `tournament:${tournamentId}`;
      socket.leave(room);
      // console.log(`[Socket.io] Socket ${socket.id} left room ${room}`);
    });

    // Join user scoped personal notification room
    socket.on('join:user', (userId: string) => {
      if (!userId) return;
      const room = `user:${userId}`;
      socket.join(room);
      socket.emit('joined:user', { userId, room });
    });

    socket.on('leave:user', (userId: string) => {
      if (!userId) return;
      socket.leave(`user:${userId}`);
    });

    socket.on('disconnect', () => {
      // console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = (): SocketIOServer | null => {
  return io;
};

/**
 * Broadcasts match:update_score event to the scoped tournament room.
 */
export const broadcastScoreUpdate = (
  tournamentId: string,
  payload: {
    matchId: string;
    roundId?: string;
    scores?: any[];
    status?: string;
    timestamp?: string;
  }
) => {
  if (io) {
    const room = `tournament:${tournamentId}`;
    io.to(room).emit('match:update_score', {
      tournamentId,
      ...payload,
      timestamp: payload.timestamp || new Date().toISOString()
    });
  }
};

/**
 * Broadcasts bracket:advance event to the scoped tournament room.
 */
export const broadcastBracketAdvance = (
  tournamentId: string,
  payload: {
    sourceMatchId: string;
    winnerParticipantId: string;
    winnerName: string;
    nextMatchId: string;
    nextMatchSlot?: number;
    targetRoundNumber: number;
    bracketTree?: any;
    timestamp?: string;
  }
) => {
  if (io) {
    const room = `tournament:${tournamentId}`;
    io.to(room).emit('bracket:advance', {
      tournamentId,
      ...payload,
      timestamp: payload.timestamp || new Date().toISOString()
    });
  }
};

/**
 * Broadcasts leaderboard:refresh event with recalculations to the scoped tournament room.
 */
export const broadcastLeaderboardRefresh = (
  tournamentId: string,
  payload: {
    standings: any[];
    roundNumber?: number;
    timestamp?: string;
  }
) => {
  if (io) {
    const room = `tournament:${tournamentId}`;
    io.to(room).emit('leaderboard:refresh', {
      tournamentId,
      ...payload,
      timestamp: payload.timestamp || new Date().toISOString()
    });
  }
};

/**
 * Sends a real-time notification to a specific user.
 */
export const sendUserNotification = (userId: string, notification: any) => {
  if (io) {
    const room = `user:${userId}`;
    io.to(room).emit('notification:new', notification);
  }
};

/**
 * Broadcasts dispute creation, status changes, and resolution to tournament participants and staff.
 */
export const broadcastDisputeEvent = (
  tournamentId: string,
  event: 'created' | 'status_changed' | 'resolved',
  payload: any
) => {
  if (io) {
    const room = `tournament:${tournamentId}`;
    io.to(room).emit(`dispute:${event}`, {
      tournamentId,
      ...payload,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Broadcasts match verification by tournament official.
 */
export const broadcastMatchVerification = (
  tournamentId: string,
  payload: {
    matchId: string;
    isVerified: boolean;
    verifiedBy: any;
    verifiedAt: string;
    verificationNotes?: string | null;
  }
) => {
  if (io) {
    const room = `tournament:${tournamentId}`;
    io.to(room).emit('match:verified', {
      tournamentId,
      ...payload,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Broadcasts participant check-in / status update.
 */
export const broadcastParticipantStatus = (
  tournamentId: string,
  payload: {
    participantId: string;
    userId: string;
    status: string;
    updatedBy?: string;
  }
) => {
  if (io) {
    const room = `tournament:${tournamentId}`;
    io.to(room).emit('participant:status_updated', {
      tournamentId,
      ...payload,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Broadcasts notification that custom match room credentials have been updated or cleared.
 */
export const broadcastMatchCredentials = (
  tournamentId: string,
  payload: {
    matchId: string;
    hasCredentials: boolean;
  }
) => {
  if (io) {
    const room = `tournament:${tournamentId}`;
    io.to(room).emit('match:credentials_updated', {
      tournamentId,
      ...payload,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Broadcasts bracket rollback event to trigger live client re-fetch.
 */
export const broadcastBracketRollback = (
  tournamentId: string,
  payload: {
    matchId?: string;
    roundId?: string;
    message?: string;
  }
) => {
  if (io) {
    const room = `tournament:${tournamentId}`;
    io.to(room).emit('bracket:rollback', {
      tournamentId,
      ...payload,
      timestamp: new Date().toISOString()
    });
  }
};



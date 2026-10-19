import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';

let io: Server | null = null;

export const initSocket = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
    }
  });

  io.on('connection', (socket: Socket) => {
    // Client joins tournament scoped room
    socket.on('join_tournament', (tournamentId: string) => {
      if (tournamentId) {
        const room = `tournament:${tournamentId}`;
        socket.join(room);
        socket.emit('joined_room', { tournamentId, room });
      }
    });

    // Client leaves tournament room
    socket.on('leave_tournament', (tournamentId: string) => {
      if (tournamentId) {
        const room = `tournament:${tournamentId}`;
        socket.leave(room);
      }
    });

    // Client joins user personal notification room
    socket.on('join_user', (userId: string) => {
      if (userId) {
        const room = `user:${userId}`;
        socket.join(room);
        socket.emit('joined_user_room', { userId, room });
      }
    });

    socket.on('leave_user', (userId: string) => {
      if (userId) {
        socket.leave(`user:${userId}`);
      }
    });

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error('Socket.io has not been initialized yet.');
  }
  return io;
};

export const broadcastTournamentEvent = (
  tournamentId: string,
  event: 'match:update_score' | 'bracket:advance' | 'leaderboard:refresh' | string,
  data: any
) => {
  if (io) {
    io.to(`tournament:${tournamentId}`).emit(event, data);
  }
};

export const broadcastUserEvent = (
  userId: string,
  event: 'notification:new' | string,
  data: any
) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

export const getActiveSocketCount = (): number => {
  if (!io) return 0;
  return io.engine ? io.engine.clientsCount : 0;
};

export const isSocketInitialized = (): boolean => {
  return io !== null;
};



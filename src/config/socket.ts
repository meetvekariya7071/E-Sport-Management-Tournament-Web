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

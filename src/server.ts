import http from 'http';
import app from './app';
import { ENV } from './config/env';
import { connectDB, disconnectDB } from './config/db';
import { initSocketServer } from './services/socket.service';

const startServer = async () => {
  await connectDB();

  const httpServer = http.createServer(app);
  initSocketServer(httpServer);

  const server = httpServer.listen(ENV.PORT, () => {
    console.log(`====================================================`);
    console.log(`  LeagueForge - Esports Tournament Management Online `);
    console.log(`  Environment: ${ENV.NODE_ENV}                     `);
    console.log(`  Port:        ${ENV.PORT}                         `);
    console.log(`  WebSockets:  ws://localhost:${ENV.PORT} (Socket.io)`);
    console.log(`  HealthCheck: http://localhost:${ENV.PORT}/api/health `);
    console.log(`====================================================`);
  });

  // Graceful Shutdown
  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Gracefully shutting down...`);
    server.close(async () => {
      await disconnectDB();
      console.log('Server process terminated cleanly.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

startServer().catch((err) => {
  console.error('Fatal Startup Error:', err);
  process.exit(1);
});

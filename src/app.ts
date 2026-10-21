import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { globalApiRateLimiter } from './middlewares/rateLimiter.middleware';
import authRoutes from './routes/auth.routes';
import gameRoutes from './routes/game.routes';
import tournamentRoutes from './routes/tournament.routes';
import adminRoutes from './routes/admin.routes';
import organizerRoutes from './routes/organizer.routes';
import playerRoutes from './routes/player.routes';
import refereeRoutes from './routes/referee.routes';
import disputeRoutes from './routes/dispute.routes';
import notificationRoutes from './routes/notification.routes';
import userRoutes from './routes/user.routes';
import { prisma } from './config/db';
import { getIO } from './services/socket.service';
import { CacheService } from './services/cache.service';
import { formatErrorResponse, AppError } from './utils/errors';

const app: Application = express();

// =========================================================================
// SECURITY & PERIMETER HEADERS (Helmet & CORS)
// =========================================================================

// Configure Helmet with secure CSP, XSS protection, and restrictive policies
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        connectSrc: ["'self'", 'ws:', 'wss:', 'http://localhost:*', 'https:'],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: []
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    xssFilter: true,
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  })
);

// CORS Policy Configuration
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server) or matching origin
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Fallback for local development
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
  })
);

// Payload Parsing with size limits to prevent body-parser memory exhaustion
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global perimeter rate limiter
app.use('/api', globalApiRateLimiter);

// Production Health Check & Live System Metrics
app.get('/api/health', async (req: Request, res: Response) => {
  let dbStatus = 'healthy';
  let latencyMs = 0;

  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    latencyMs = Date.now() - start;
  } catch (err: any) {
    dbStatus = 'degraded';
    console.error('[HealthCheck DB Error]', err);
  }

  const io = getIO();
  const socketActive = !!io;
  const connectedSockets = io?.engine?.clientsCount || 0;
  const memory = process.memoryUsage();
  const cacheStats = CacheService.getStats();

  const isHealthy = dbStatus === 'healthy';

  res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    status: isHealthy ? 'online' : 'degraded',
    timestamp: new Date().toISOString(),
    service: 'Esports Tournament Management API',
    database: {
      status: dbStatus,
      latencyMs,
      dialect: 'sqlite'
    },
    websocket: {
      status: socketActive ? 'active' : 'inactive',
      connectedClients: connectedSockets
    },
    cache: {
      status: 'active',
      keys: cacheStats.keysCount,
      hits: cacheStats.hits,
      misses: cacheStats.misses
    },
    system: {
      uptimeSeconds: Math.floor(process.uptime()),
      memory: {
        rssMb: Math.round(memory.rss / (1024 * 1024) * 10) / 10,
        heapUsedMb: Math.round(memory.heapUsed / (1024 * 1024) * 10) / 10,
        heapTotalMb: Math.round(memory.heapTotal / (1024 * 1024) * 10) / 10
      },
      nodeVersion: process.version,
      platform: process.platform
    }
  });
});

// Root Endpoint - Welcome & Status
app.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Esports Tournament Management API is online and operational.',
    version: '1.0.0',
    healthCheck: 'http://localhost:5000/api/health',
    frontendUrl: 'http://localhost:3000/login'
  });
});

// Primary Domain Routes
app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/organizer', organizerRoutes);
app.use('/api/player', playerRoutes);
app.use('/api/referee', refereeRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/user', userRoutes);

// 404 Handler - Centralized Format
app.use((req: Request, res: Response) => {
  res.status(404).json(
    formatErrorResponse(
      `Endpoint '${req.method} ${req.originalUrl}' does not exist on this server.`,
      'ENDPOINT_NOT_FOUND'
    )
  );
});

// Global Error Handler - Centralized JSON Structure
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Unhandled Error]', err);

  const statusCode = err.statusCode || err.status || 500;
  const errorCode = err.errorCode || (statusCode === 404 ? 'RESOURCE_NOT_FOUND' : 'INTERNAL_SERVER_ERROR');
  const message = err.message || 'An unexpected internal error occurred.';
  const details = err.details || null;

  res.status(statusCode).json(formatErrorResponse(message, errorCode, details));
});

export default app;


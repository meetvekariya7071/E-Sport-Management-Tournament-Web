import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.routes';
import gameRoutes from './routes/game.routes';
import tournamentRoutes from './routes/tournament.routes';
import adminRoutes from './routes/admin.routes';
import organizerRoutes from './routes/organizer.routes';
import playerRoutes from './routes/player.routes';
import refereeRoutes from './routes/referee.routes';
import disputeRoutes from './routes/dispute.routes';
import notificationRoutes from './routes/notification.routes';

import { authRateLimiter, publicApiRateLimiter } from './middlewares/rateLimiter.middleware';
import { ENV } from './config/env';

const app: Application = express();

// Trust reverse proxy (Nginx / Docker ingress) for accurate client IP rate limiting
app.set('trust proxy', 1);

// Security Headers via Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        connectSrc: ["'self'", 'ws:', 'wss:', 'http://localhost:5000', 'ws://localhost:5000'],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: []
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// CORS Policy
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow localhost dev origins, mobile apps, or curl/postman without origin
      if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

import { HealthController } from './controllers/health.controller';
import { notFoundHandler, globalErrorHandler } from './middlewares/errorHandler.middleware';

// Production Health Check & Metrics
app.get('/api/health', HealthController.getHealth);

// Primary Domain Routes with Rate Limiting Guards
app.use('/api/auth', authRateLimiter, authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/tournaments', publicApiRateLimiter, tournamentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/organizer', organizerRoutes);
app.use('/api/player', playerRoutes);
app.use('/api/referee', refereeRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/notifications', notificationRoutes);

// Centralized 404 & Global Error Handling
app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;

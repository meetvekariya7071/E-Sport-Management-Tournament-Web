import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Relax limits during automated test runs or local development
const isRelaxedEnv = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development';

// Helper to detect localhost requests
const isLocalhost = (req: Request): boolean => {
  const ip = req.ip || req.socket?.remoteAddress || '';
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '::ffff:127.0.0.1' ||
    ip.includes('127.0.0.1') ||
    req.hostname === 'localhost'
  );
};

/**
 * Strict Rate Limiter for Authentication Endpoints (/api/auth/*)
 * Enforces a strict threshold to mitigate brute-force credential stuffing and password guessing.
 * Rule: Maximum 5 failed attempts per 15 minutes per IP address in production.
 * In development or on localhost (127.0.0.1), limits are relaxed/skipped to prevent developer lockouts.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isRelaxedEnv ? 1000 : 5, // 1000 attempts in development/test, 5 failed attempts per 15 minutes in production
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failed login attempts against the limit!
  skip: (req: Request) =>
    process.env.NODE_ENV === 'development' ||
    process.env.NODE_ENV === 'test' ||
    isLocalhost(req),
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Too many authentication attempts from this IP address. Please try again after 15 minutes.',
      retryAfter: Math.ceil(15 * 60)
    });
  }
});

/**
 * General Rate Limiter for Public Tournament Endpoints (/api/tournaments/*)
 * Protects read-heavy tournament catalog, bracket views, and registrations against traffic spikes/DDoS.
 * Rule: Maximum 120 requests per minute per IP address.
 */
export const tournamentRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: isRelaxedEnv ? 2000 : 120, // 120 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) =>
    process.env.NODE_ENV === 'development' ||
    process.env.NODE_ENV === 'test' ||
    isLocalhost(req),
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded on tournament services. Please wait a moment before sending more requests.',
      retryAfter: 60
    });
  }
});

/**
 * Global API Rate Limiter
 * Baseline perimeter security across all other API endpoints.
 * Rule: Maximum 300 requests per 15 minutes per IP address.
 */
export const globalApiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isRelaxedEnv ? 5000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) =>
    process.env.NODE_ENV === 'development' ||
    process.env.NODE_ENV === 'test' ||
    isLocalhost(req),
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Too many requests dispatched to API gateway. Please throttle your client requests.',
      retryAfter: Math.ceil(15 * 60)
    });
  }
});

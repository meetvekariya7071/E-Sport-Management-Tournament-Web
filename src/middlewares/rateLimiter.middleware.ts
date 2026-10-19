import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

const isDev = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

const isLocalhost = (ip?: string): boolean => {
  if (!ip) return false;
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '::ffff:127.0.0.1' ||
    ip === 'localhost'
  );
};

/**
 * Rate limiting for authentication endpoints to prevent brute-force attacks.
 * In development and on localhost (127.0.0.1 / ::1), rate limiting is skipped or raised to 1000.
 * Successful requests are skipped so only failed attempts count against the limit.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev || isTest ? 1000 : 5, // 1000 in dev/test, 5 in production
  skip: (req: Request) => isDev || isLocalhost(req.ip),
  skipSuccessfulRequests: true, // Only count failed attempts
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: {
    success: false,
    message: 'Too many failed authentication attempts from this IP. Please try again after 15 minutes.',
    errorCode: 'RATE_LIMIT_EXCEEDED',
    details: null,
    error: 'Too many authentication attempts from this IP. Please try again after 15 minutes.'
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many failed authentication attempts from this IP. Please try again after 15 minutes.',
      errorCode: 'RATE_LIMIT_EXCEEDED',
      details: null,
      error: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
      retryAfter: Math.ceil((req as any).rateLimit?.resetTime?.getTime() / 1000)
    });
  }
});

/**
 * General rate limiter for public tournament endpoints.
 * Allows up to 100 requests per 15 minutes per IP (1000 in dev/test).
 */
export const publicApiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev || isTest ? 2000 : 100,
  skip: (req: Request) => isDev || isLocalhost(req.ip),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Rate limit exceeded on tournament public endpoints. Please slow down requests.',
    errorCode: 'RATE_LIMIT_EXCEEDED',
    details: null,
    error: 'Rate limit exceeded on tournament public endpoints. Please slow down requests.'
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Rate limit exceeded on tournament public endpoints. Please slow down requests.',
      errorCode: 'RATE_LIMIT_EXCEEDED',
      details: null,
      error: 'Rate limit exceeded on tournament public endpoints. Please slow down requests.'
    });
  }
});

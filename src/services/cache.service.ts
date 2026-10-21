import NodeCache from 'node-cache';
import { Request, Response, NextFunction } from 'express';

// Standard 30-second TTL default for high-read esports matches
const cache = new NodeCache({
  stdTTL: 30,
  checkperiod: 45,
  useClones: false
});

export class CacheService {
  /**
   * Retrieves an item from cache.
   */
  static get<T>(key: string): T | undefined {
    return cache.get<T>(key);
  }

  /**
   * Stores an item with custom or default TTL (in seconds).
   */
  static set(key: string, value: any, ttlSeconds: number = 30): boolean {
    return cache.set(key, value, ttlSeconds);
  }

  /**
   * Deletes a specific key.
   */
  static del(key: string): number {
    return cache.del(key);
  }

  /**
   * Dynamic cache invalidation:
   * Invalidates all cached entries associated with a given tournament ID
   * (e.g., details, bracket tree, sub-database queries, public catalog).
   */
  static invalidateTournament(tournamentId: string): void {
    const allKeys = cache.keys();
    const pattern = `tournament:${tournamentId}`;
    const keysToDelete = allKeys.filter(
      (k) =>
        k.startsWith(pattern) ||
        k.includes(tournamentId) ||
        k.startsWith('tournaments:catalog')
    );

    if (keysToDelete.length > 0) {
      cache.del(keysToDelete);
    }
  }

  /**
   * Flushes entire cache.
   */
  static flushAll(): void {
    cache.flushAll();
  }

  /**
   * Returns cache metrics and key stats.
   */
  static getStats() {
    const stats = cache.getStats();
    return {
      keysCount: cache.keys().length,
      hits: stats.hits,
      misses: stats.misses,
      ksize: stats.ksize,
      vsize: stats.vsize
    };
  }
}


/**
 * Express middleware for automatic route response caching.
 */
export const cacheRoute = (prefix: string, ttlSeconds: number = 20) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const tournamentId = req.params.id || req.params.tournamentId || '';
    const queryStr = Object.keys(req.query).length > 0 ? JSON.stringify(req.query) : '';
    const cacheKey = tournamentId
      ? `tournament:${tournamentId}:${prefix}${queryStr ? `:${queryStr}` : ''}`
      : `tournaments:${prefix}:${req.originalUrl}`;

    const cachedData = CacheService.get(cacheKey);

    if (cachedData) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-Cache-Key', cacheKey);
      res.status(200).json(cachedData);
      return;
    }

    // Intercept res.json to populate cache
    res.setHeader('X-Cache', 'MISS');
    const originalJson = res.json.bind(res);

    res.json = (body: any) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        CacheService.set(cacheKey, body, ttlSeconds);
      }
      return originalJson(body);
    };

    next();
  };
};

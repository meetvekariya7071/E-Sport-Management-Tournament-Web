import NodeCache from 'node-cache';
import { Request, Response, NextFunction } from 'express';

class CacheService {
  private cache: NodeCache;

  constructor() {
    // Standard default TTL of 30 seconds, purge check every 60 seconds
    this.cache = new NodeCache({
      stdTTL: 30,
      checkperiod: 60,
      useClones: false
    });
  }

  get<T>(key: string): T | undefined {
    return this.cache.get<T>(key);
  }

  set<T>(key: string, value: T, ttlSeconds?: number): boolean {
    if (ttlSeconds !== undefined) {
      return this.cache.set(key, value, ttlSeconds);
    }
    return this.cache.set(key, value);
  }

  del(key: string): number {
    return this.cache.del(key);
  }

  /**
   * Invalidate all cache entries associated with a specific tournament.
   * Clears brackets, leaderboards, database views, and public listings.
   */
  invalidateTournament(tournamentId: string): void {
    const allKeys = this.cache.keys();
    const keysToDelete = allKeys.filter(
      (key) =>
        key.includes(tournamentId) ||
        key.includes('/api/tournaments')
    );

    if (keysToDelete.length > 0) {
      this.cache.del(keysToDelete);
    }
  }

  /**
   * Clears public catalog cache (e.g. when tournaments change status)
   */
  invalidatePublicCatalogs(): void {
    const allKeys = this.cache.keys();
    const catalogKeys = allKeys.filter((key) => key.startsWith('tournaments:public'));
    if (catalogKeys.length > 0) {
      this.cache.del(catalogKeys);
    }
  }

  /**
   * Express middleware for route-level GET caching.
   * @param ttlSeconds Seconds to cache the response (default: 20s)
   */
  middleware(ttlSeconds = 20) {
    return (req: Request, res: Response, next: NextFunction): void => {
      // Only cache GET requests
      if (req.method !== 'GET') {
        return next();
      }

      const cacheKey = `http:${req.originalUrl || req.url}`;
      const cachedResponse = this.cache.get<any>(cacheKey);

      if (cachedResponse) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-TTL', `${ttlSeconds}s`);
        res.status(200).json(cachedResponse);
        return;
      }

      res.setHeader('X-Cache', 'MISS');

      // Intercept res.json to cache response payload before sending
      const originalJson = res.json.bind(res);
      res.json = (body: any) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          this.cache.set(cacheKey, body, ttlSeconds);
        }
        return originalJson(body);
      };

      next();
    };
  }

  getStats() {
    return {
      keysCount: this.cache.keys().length,
      ...this.cache.getStats()
    };
  }
}

export const cacheService = new CacheService();


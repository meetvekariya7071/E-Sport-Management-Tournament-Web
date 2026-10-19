import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { getActiveSocketCount, isSocketInitialized } from '../config/socket';
import { cacheService } from '../services/cache.service';

export class HealthController {
  static async getHealth(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    let dbStatus = 'healthy';
    let dbLatencyMs = 0;

    try {
      const dbPingStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - dbPingStart;
    } catch (err: any) {
      dbStatus = 'unhealthy';
      console.error('[HealthCheck] DB Ping Failed:', err.message);
    }

    const mem = process.memoryUsage();
    const uptimeSeconds = Math.floor(process.uptime());
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;
    const uptimeFormatted = `${hours}h ${minutes}m ${seconds}s`;

    const cacheStats = cacheService.getStats();
    const activeSockets = getActiveSocketCount();
    const socketOnline = isSocketInitialized();

    const isSystemHealthy = dbStatus === 'healthy';

    res.status(isSystemHealthy ? 200 : 503).json({
      status: isSystemHealthy ? 'online' : 'degraded',
      service: 'Esports Tournament Management API',
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: uptimeSeconds,
        formatted: uptimeFormatted
      },
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
        provider: 'SQLite (Prisma ORM)'
      },
      websocket: {
        status: socketOnline ? 'active' : 'offline',
        activeConnections: activeSockets
      },
      cache: {
        status: 'active',
        activeKeys: cacheStats.keysCount,
        hits: cacheStats.hits,
        misses: cacheStats.misses
      },
      memory: {
        rss: `${Math.round(mem.rss / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)} MB`
      },
      responseTimeMs: Date.now() - startTime
    });
  }
}

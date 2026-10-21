import { prisma } from '../config/db';

export interface CreateAuditLogParams {
  actorId?: string | null;
  action: string;
  targetEntity: string;
  targetId?: string | null;
  ipAddress?: string | null;
  details?: Record<string, any> | string;
}

export class AuditService {
  /**
   * Records an audit log entry in the system.
   */
  static async log(params: CreateAuditLogParams) {
    try {
      const detailsStr =
        typeof params.details === 'object'
          ? JSON.stringify(params.details)
          : params.details || '{}';

      const entry = await prisma.auditLog.create({
        data: {
          actorId: params.actorId || null,
          action: params.action,
          targetEntity: params.targetEntity,
          targetId: params.targetId || null,
          ipAddress: params.ipAddress || null,
          details: detailsStr
        }
      });
      return entry;
    } catch (err) {
      console.error('[AuditService.log error]:', err);
      // Non-blocking: audit failure shouldn't crash primary business logic
      return null;
    }
  }

  /**
   * Retrieves paginated audit logs with search and filtering for Admin view.
   */
  static async getLogs(query: {
    page?: number;
    limit?: number;
    action?: string;
    targetEntity?: string;
    actorId?: string;
    search?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.action) {
      where.action = query.action;
    }

    if (query.targetEntity) {
      where.targetEntity = query.targetEntity;
    }

    if (query.actorId) {
      where.actorId = query.actorId;
    }

    if (query.search) {
      where.OR = [
        { action: { contains: query.search } },
        { targetEntity: { contains: query.search } },
        { targetId: { contains: query.search } },
        { details: { contains: query.search } },
        { actor: { username: { contains: query.search } } }
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: {
              id: true,
              username: true,
              email: true,
              role: true,
              avatarUrl: true
            }
          }
        }
      }),
      prisma.auditLog.count({ where })
    ]);

    return {
      logs: logs.map((log: any) => ({
        ...log,
        details: (() => {
          try {
            return JSON.parse(log.details || '{}');
          } catch {
            return log.details;
          }
        })()
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}

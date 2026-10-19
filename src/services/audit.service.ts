import { prisma } from '../config/db';

export interface CreateAuditLogDTO {
  actorId?: string | null;
  actionType: string;
  targetEntity: string;
  targetId?: string | null;
  details?: any;
  ipAddress?: string | null;
  context?: string | null;
}

export class AuditService {
  /**
   * Log an audit action safely in the background
   */
  static async log(dto: CreateAuditLogDTO) {
    try {
      return await prisma.auditLog.create({
        data: {
          actorId: dto.actorId || null,
          actionType: dto.actionType,
          targetEntity: dto.targetEntity,
          targetId: dto.targetId || null,
          details: typeof dto.details === 'string' ? dto.details : JSON.stringify(dto.details || {}),
          ipAddress: dto.ipAddress || null,
          context: dto.context || null
        }
      });
    } catch (err) {
      console.error('[AuditService.log Error]', err);
      return null;
    }
  }

  /**
   * Fetch paginated audit trail for Admin view
   */
  static async getLogs(params: {
    page?: number;
    limit?: number;
    actionType?: string;
    targetEntity?: string;
    search?: string;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.actionType && params.actionType !== 'ALL') {
      where.actionType = params.actionType;
    }

    if (params.targetEntity && params.targetEntity !== 'ALL') {
      where.targetEntity = params.targetEntity;
    }

    if (params.search) {
      where.OR = [
        { actionType: { contains: params.search } },
        { targetEntity: { contains: params.search } },
        { targetId: { contains: params.search } },
        { actor: { username: { contains: params.search } } },
        { actor: { email: { contains: params.search } } }
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          actor: {
            select: {
              id: true,
              username: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip
      }),
      prisma.auditLog.count({ where })
    ]);

    return {
      items: logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }
}

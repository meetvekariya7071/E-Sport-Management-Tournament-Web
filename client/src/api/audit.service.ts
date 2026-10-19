import api from './axios';

export interface AuditLogItem {
  id: string;
  actorId?: string | null;
  actionType: string;
  targetEntity: string;
  targetId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  context?: string | null;
  createdAt: string;
  actor?: {
    id: string;
    username: string;
    email: string;
    role: string;
  } | null;
}

export const AuditAPI = {
  async getAuditLogs(params?: {
    page?: number;
    limit?: number;
    actionType?: string;
    targetEntity?: string;
    search?: string;
  }) {
    const res = await api.get('/admin/audit-logs', { params });
    return res.data;
  }
};

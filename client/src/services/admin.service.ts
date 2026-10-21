import api from './axios';
import { Game, Role, Tournament, User } from '../types';

export interface KPISummary {
  totalPlayers: number;
  activeOrganizers: number;
  activeTournaments: number;
  totalGames: number;
  totalMatches: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TournamentInspection {
  overview: Tournament & { createdAt: string };
  players: Array<{
    id: string;
    userId: string;
    username: string;
    email: string;
    isBanned: boolean;
    status: string;
    seed?: number | null;
    team?: { id: string; name: string; tag?: string | null } | null;
    registeredAt: string;
    disqualified: boolean;
    disqualifyReason?: string | null;
  }>;
  teams: Array<{
    id: string;
    name: string;
    tag?: string | null;
    inviteCode?: string | null;
    captain: { id: string; username: string };
    rosterCount: number;
    members: Array<{ id: string; username: string; role: string }>;
    createdAt: string;
  }>;
  bracket: Array<{
    id: string;
    roundNumber: number;
    name: string;
    matches: Array<{
      id: string;
      matchNumber: number;
      status: string;
      referee?: { id: string; username: string } | null;
      scheduledAt?: string | null;
      completedAt?: string | null;
      results: Array<{
        id: string;
        score: number;
        kills?: number | null;
        placement?: number | null;
        isWinner: boolean;
        competitorName: string;
      }>;
    }>;
  }>;
}

export const adminService = {
  async getKPISummary(): Promise<KPISummary> {
    const res = await api.get('/admin/kpis');
    return res.data.data;
  },

  async getTableData<T = any>(
    table: 'players' | 'organizers' | 'referees' | 'games' | 'tournaments',
    params?: {
      page?: number;
      limit?: number;
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<PaginatedResult<T>> {
    const res = await api.get(`/admin/tables/${table}`, { params });
    const payload = res?.data;
    const rawData = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.games)
      ? payload.games
      : Array.isArray(payload?.tournaments)
      ? payload.tournaments
      : Array.isArray(payload?.[table])
      ? payload[table]
      : [];

    const pagination = payload?.pagination || {
      page: params?.page || 1,
      limit: params?.limit || 8,
      total: rawData.length,
      totalPages: Math.max(1, Math.ceil(rawData.length / (params?.limit || 8)))
    };

    return {
      data: rawData,
      pagination
    };
  },

  async toggleUserBan(userId: string, isBanned: boolean, reason?: string): Promise<User> {
    const res = await api.patch(`/admin/users/${userId}/status`, {
      isBanned,
      reason
    });
    return res.data.data;
  },

  async deleteTournament(tournamentId: string): Promise<void> {
    await api.delete(`/admin/tournaments/${tournamentId}`);
  },

  async inspectTournament(tournamentId: string): Promise<TournamentInspection> {
    const res = await api.get(`/admin/tournaments/${tournamentId}/inspect`);
    return res.data.data;
  },

  async createGame(data: {
    title: string;
    slug: string;
    genre: string;
    platform?: string;
    coverImage?: string;
    isTeamBased?: boolean;
    minTeamSize?: number;
    maxTeamSize?: number;
  }): Promise<Game> {
    const res = await api.post('/admin/games', data);
    return res.data.data;
  },

  async updateGame(
    gameId: string,
    data: {
      title?: string;
      slug?: string;
      genre?: string;
      platform?: string;
      coverImage?: string;
      isTeamBased?: boolean;
      minTeamSize?: number;
      maxTeamSize?: number;
    }
  ): Promise<Game> {
    const res = await api.put(`/admin/games/${gameId}`, data);
    return res.data.data;
  },

  async deleteGame(gameId: string): Promise<void> {
    await api.delete(`/admin/games/${gameId}`);
  },

  async getAuditLogs(params?: {
    page?: number;
    limit?: number;
    action?: string;
    targetEntity?: string;
    actorId?: string;
    search?: string;
  }): Promise<{
    logs: Array<{
      id: string;
      actorId?: string | null;
      action: string;
      targetEntity: string;
      targetId?: string | null;
      ipAddress?: string | null;
      details: any;
      createdAt: string;
      actor?: {
        id: string;
        username: string;
        email: string;
        role: string;
        avatarUrl?: string | null;
      } | null;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const res = await api.get('/admin/audit-logs', { params });
    return {
      logs: res.data.logs,
      pagination: res.data.pagination
    };
  },

  async getSystemHealth(): Promise<{
    success: boolean;
    status: string;
    database: { status: string; latencyMs: number; dialect: string };
    websocket: { status: string; connectedClients: number };
    cache: { status: string; keys: number; hits: number; misses: number };
    system: {
      uptimeSeconds: number;
      memory: { rssMb: number; heapUsedMb: number; heapTotalMb: number };
      nodeVersion: string;
      platform: string;
    };
  }> {
    const res = await api.get('/health');
    return res.data;
  }
};



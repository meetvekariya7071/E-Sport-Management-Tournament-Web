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
    return {
      data: res.data.data,
      pagination: res.data.pagination
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
  }
};

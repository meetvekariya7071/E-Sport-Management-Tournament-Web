import api from './axios';

export interface DisputeItem {
  id: string;
  tournamentId: string;
  matchId: string;
  claimantId: string;
  reason: string;
  description: string;
  proofUrl?: string | null;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED';
  resolutionNotes?: string | null;
  resolvedById?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  tournament?: {
    id: string;
    title: string;
    slug: string;
    status: string;
  };
  claimant: {
    id: string;
    username: string;
    email?: string;
    avatarUrl?: string | null;
  };
  resolvedBy?: {
    id: string;
    username: string;
    role: string;
  } | null;
  match: {
    id: string;
    matchNumber: number;
    status: string;
    round?: {
      id?: string;
      roundNumber: number;
      name: string;
    };
    results?: Array<{
      id: string;
      participantId: string;
      score: number;
      kills?: number | null;
      placement?: number | null;
      isWinner: boolean;
      participant?: {
        id: string;
        user?: { id: string; username: string };
        team?: { id: string; name: string };
      };
    }>;
  };
}

export const disputeApi = {
  createDispute: async (
    tournamentId: string,
    data: { matchId: string; reason: string; description: string; proofUrl?: string }
  ) => {
    const res = await api.post(`/tournaments/${tournamentId}/disputes`, data);
    return res.data;
  },

  getTournamentDisputes: async (tournamentId: string, status?: string): Promise<DisputeItem[]> => {
    const res = await api.get(`/tournaments/${tournamentId}/disputes`, {
      params: { status }
    });
    return res.data.data;
  },

  getUserDisputes: async (params?: { tournamentId?: string; status?: string }): Promise<DisputeItem[]> => {
    const res = await api.get('/disputes', { params });
    return res.data.data;
  },

  resolveDispute: async (
    disputeId: string,
    data: {
      action: 'INVESTIGATE' | 'ACCEPT_OVERWRITE' | 'DISMISS';
      resolutionNotes: string;
      scoreAdjustments?: Array<{
        participantId: string;
        score: number;
        kills?: number;
        placement?: number;
        isWinner?: boolean;
      }>;
    }
  ) => {
    const res = await api.patch(`/disputes/${disputeId}/resolve`, data);
    return res.data;
  }
};

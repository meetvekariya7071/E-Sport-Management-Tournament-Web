import api from './axios';

export interface DisputeItem {
  id: string;
  tournamentId: string;
  matchId?: string | null;
  raisedById: string;
  reason: 'CHEATING' | 'INCORRECT_SCORE' | 'TOXIC_CONDUCT' | 'RULE_VIOLATION' | 'OTHER';
  description: string;
  proofUrl?: string | null;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED';
  resolutionNote?: string | null;
  resolvedById?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  raisedBy: { id: string; username: string; email: string };
  resolvedBy?: { id: string; username: string } | null;
  tournament?: { id: string; title: string };
  match?: any;
}

export const DisputeAPI = {
  async raiseDispute(tournamentId: string, data: {
    matchId?: string;
    reason: string;
    description: string;
    proofUrl?: string;
  }) {
    const res = await api.post(`/tournaments/${tournamentId}/disputes`, data);
    return res.data;
  },

  async getTournamentDisputes(tournamentId: string, status?: string) {
    const res = await api.get(`/tournaments/${tournamentId}/disputes`, {
      params: { status }
    });
    return res.data;
  },

  async getAllDisputes(params?: { tournamentId?: string; status?: string }) {
    const res = await api.get('/disputes', { params });
    return res.data;
  },

  async resolveDispute(
    disputeId: string,
    data: {
      status: 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED';
      resolutionNote: string;
      overwriteScore?: {
        matchId: string;
        results: Array<{
          participantId: string;
          score: number;
          kills?: number;
          placement?: number;
          isWinner?: boolean;
        }>;
      };
    }
  ) {
    const res = await api.patch(`/disputes/${disputeId}/resolve`, data);
    return res.data;
  }
};

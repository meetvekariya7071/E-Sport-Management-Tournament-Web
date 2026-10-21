import api from './axios';

export interface RefereeMatch {
  id: string;
  tournamentId: string;
  roundId: string;
  matchNumber: number;
  refereeId?: string | null;
  status: string;
  isVerified: boolean;
  verifiedById?: string | null;
  verifiedAt?: string | null;
  verificationNotes?: string | null;
  tournament: {
    id: string;
    title: string;
    format: string;
    status: string;
    structure?: string;
    game: {
      id: string;
      title: string;
      coverImage?: string | null;
      platform?: string;
    };
  };
  round: {
    id: string;
    roundNumber: number;
    name: string;
    stage?: string | null;
  };
  referee?: {
    id: string;
    username: string;
    role: string;
  } | null;
  verifiedBy?: {
    id: string;
    username: string;
    role: string;
  } | null;
  results: Array<{
    id: string;
    participantId: string;
    score: number;
    kills?: number | null;
    placement?: number | null;
    isWinner: boolean;
    participant: {
      id: string;
      userId: string;
      teamId?: string | null;
      inGameName?: string | null;
      user?: {
        id: string;
        username: string;
        email?: string;
        avatarUrl?: string | null;
      };
      team?: {
        id: string;
        name: string;
        tag?: string | null;
      } | null;
    };
  }>;
  disputes?: Array<{
    id: string;
    status: string;
    reason: string;
    description?: string;
    proofUrl?: string | null;
    createdAt: string;
    claimant?: {
      id: string;
      username: string;
    };
  }>;
}

export interface CheckInParticipant {
  id: string;
  tournamentId: string;
  userId: string;
  teamId?: string | null;
  inGameName?: string | null;
  status: string;
  disqualifiedBy?: string | null;
  disqualifyReason?: string | null;
  registeredAt: string;
  user: {
    id: string;
    username: string;
    email: string;
    avatarUrl?: string | null;
    bio?: string | null;
  };
  team?: {
    id: string;
    name: string;
    tag?: string | null;
  } | null;
}

export interface SanctionInput {
  action: 'ISSUE_WARNING' | 'DISQUALIFY_MATCH' | 'ESCALATE_ADMIN';
  reason: string;
  tournamentId?: string;
  matchId?: string;
  evidenceUrl?: string;
  notes?: string;
}

export const refereeApi = {
  getAssignedMatches: async (tournamentId?: string): Promise<RefereeMatch[]> => {
    const res = await api.get('/referee/matches', {
      params: { tournamentId }
    });
    return res.data.data;
  },

  getMatchById: async (matchId: string): Promise<RefereeMatch> => {
    const res = await api.get(`/referee/matches/${matchId}`);
    return res.data.data;
  },

  verifyMatchScore: async (
    matchId: string,
    payload: {
      notes?: string;
      override?: boolean;
      scores?: Array<{
        participantId: string;
        score: number;
        kills?: number;
        placement?: number | null;
        isWinner?: boolean;
      }>;
    }
  ) => {
    const res = await api.post(`/referee/matches/${matchId}/verify-score`, payload);
    return res.data;
  },

  verifyMatch: async (matchId: string, notes?: string) => {
    const res = await api.patch(`/referee/matches/${matchId}/verify`, { notes });
    return res.data;
  },

  getAssignedDisputes: async (params?: { tournamentId?: string; status?: string }) => {
    const res = await api.get('/referee/disputes', { params });
    return res.data.data;
  },

  resolveDispute: async (
    disputeId: string,
    data: {
      action: 'UPHOLD' | 'DISMISS' | 'INVESTIGATE';
      resolutionNotes: string;
      overturnResult?: {
        type?: 'FORFEIT_WALKOVER' | 'DOCK_POINTS' | 'OVERWRITE_SCORES';
        winnerParticipantId?: string;
        forfeitParticipantId?: string;
        dockedParticipantId?: string;
        pointsDeducted?: number;
        scoreAdjustments?: Array<{
          participantId: string;
          score: number;
          kills?: number;
          placement?: number | null;
          isWinner?: boolean;
        }>;
      };
    }
  ) => {
    const res = await api.patch(`/referee/disputes/${disputeId}`, data);
    return res.data;
  },

  sanctionPlayer: async (targetId: string, data: SanctionInput) => {
    const res = await api.post(`/referee/players/${targetId}/sanction`, data);
    return res.data;
  },

  getCheckInList: async (tournamentId: string): Promise<CheckInParticipant[]> => {
    const res = await api.get(`/referee/tournaments/${tournamentId}/check-in`);
    return res.data.data;
  },

  updateParticipantStatus: async (
    participantId: string,
    status: 'REGISTERED' | 'CHECKED_IN' | 'PRESENT' | 'NO_SHOW' | 'DISQUALIFIED',
    reason?: string
  ) => {
    const res = await api.patch(`/referee/participants/${participantId}/status`, {
      status,
      reason
    });
    return res.data;
  }
};

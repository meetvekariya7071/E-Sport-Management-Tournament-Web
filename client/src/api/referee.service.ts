import api from './axios';

export interface RefereeKPIs {
  totalAssigned: number;
  awaitingCheckin: number;
  inProgress: number;
  pendingValidation: number;
  completed: number;
  activeDisputes: number;
}

export interface MatchCheckinPayload {
  participantId: string;
  status?: 'CHECKED_IN' | 'LATE' | 'NO_SHOW' | 'DISQUALIFIED' | 'REGISTERED';
  reason?: string;
  isSubstituteApproved?: boolean;
  checkinNote?: string;
}

export interface MatchStatusPayload {
  status?: 'PENDING' | 'SCHEDULED' | 'AWAITING_CHECKIN' | 'IN_PROGRESS' | 'COMPLETED' | 'DISPUTED';
  lockRoster?: boolean;
  lobbyCredentials?: string;
}

export const RefereeAPI = {
  // 1. Get assigned matches with KPI metrics
  async getAssignedMatches(tournamentId?: string) {
    const res = await api.get('/referee/matches', { params: { tournamentId } });
    return res.data;
  },

  // 2. Get Match Control Room data
  async getMatchControlRoom(matchId: string) {
    const res = await api.get(`/referee/matches/${matchId}`);
    return res.data;
  },

  // 3. Update match attendance checklist (Present, Late, No-Show, Disqualified) & substitute approval
  async updateMatchCheckIn(matchId: string, data: MatchCheckinPayload) {
    const res = await api.patch(`/referee/matches/${matchId}/checkin`, data);
    return res.data;
  },

  // 4. Lock Roster & Start Match / Update match status
  async updateMatchStatus(matchId: string, data: MatchStatusPayload) {
    const res = await api.patch(`/referee/matches/${matchId}/status`, data);
    return res.data;
  },

  // 5. One-click scorecard verification
  async verifyMatch(matchId: string) {
    const res = await api.patch(`/referee/matches/${matchId}/verify`);
    return res.data;
  },

  // 6. Tournament-level check-in roster
  async getTournamentRoster(tournamentId: string) {
    const res = await api.get(`/referee/tournaments/${tournamentId}/participants`);
    return res.data;
  },

  // 6b. Tournament participant check-in
  async updateCheckIn(
    tournamentId: string,
    participantId: string,
    status: 'CHECKED_IN' | 'NO_SHOW' | 'DISQUALIFIED' | 'REGISTERED',
    reason?: string
  ) {
    const res = await api.patch(
      `/referee/tournaments/${tournamentId}/participants/${participantId}/check-in`,
      { status, reason }
    );
    return res.data;
  },

  // 7. Read-only sub-database inspection for referees
  async getTournamentDatabase(tournamentId: string) {
    const res = await api.get(`/referee/tournaments/${tournamentId}/database`);
    return res.data;
  },

  // 8. Assign referee to tournament or specific match (Admin & Organizer)
  async assignReferee(tournamentId: string, data: { refereeId: string; matchId?: string }) {
    const res = await api.post(`/tournaments/${tournamentId}/assign-referee`, data);
    return res.data;
  },

  // 9. Score Verification & Official Sign-off with comparison and override
  async verifyScorecardWithOverride(
    matchId: string,
    data: {
      action: 'APPROVE' | 'OVERRIDE';
      refereeNote: string;
      results?: Array<{
        participantId: string;
        score: number;
        kills?: number;
        placement?: number;
        isWinner?: boolean;
      }>;
    }
  ) {
    const res = await api.post(`/referee/matches/${matchId}/verify-score`, data);
    return res.data;
  },

  // 10. Fetch dispute queue for assigned matches
  async getRefereeDisputes(status?: string) {
    const res = await api.get('/referee/disputes', { params: { status } });
    return res.data;
  },

  // 11. Resolve dispute: Uphold (overturn, forfeit, dock points) or Dismiss
  async resolveRefereeDispute(
    disputeId: string,
    data: {
      action: 'UPHOLD' | 'DISMISS' | 'INVESTIGATE';
      actionTaken?: 'UPHELD' | 'DISMISSED' | 'FORFEIT_AWARDED' | 'POINTS_DOCKED';
      resolutionNote: string;
      forfeitWinnerParticipantId?: string;
      dockedParticipantId?: string;
      dockPoints?: number;
      overwriteScore?: any;
    }
  ) {
    const res = await api.patch(`/referee/disputes/${disputeId}`, data);
    return res.data;
  },

  // 12. Disciplinary & Flagging Actions
  async sanctionPlayer(
    targetId: string,
    data: {
      sanctionType: 'WARNING' | 'MATCH_DISQUALIFY' | 'ESCALATE_ADMIN';
      reason: string;
      tournamentId?: string;
      matchId?: string;
      proofUrl?: string;
    }
  ) {
    const res = await api.post(`/referee/players/${targetId}/sanction`, data);
    return res.data;
  }
};

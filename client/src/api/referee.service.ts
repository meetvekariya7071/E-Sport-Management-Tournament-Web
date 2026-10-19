import api from './axios';

export const RefereeAPI = {
  async getAssignedMatches(tournamentId?: string) {
    const res = await api.get('/referee/matches', { params: { tournamentId } });
    return res.data;
  },

  async verifyMatch(matchId: string) {
    const res = await api.patch(`/referee/matches/${matchId}/verify`);
    return res.data;
  },

  async getTournamentRoster(tournamentId: string) {
    const res = await api.get(`/referee/tournaments/${tournamentId}/participants`);
    return res.data;
  },

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
  }
};

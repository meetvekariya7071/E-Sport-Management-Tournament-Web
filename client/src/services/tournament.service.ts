import api from './axios';
import { Tournament, TournamentDetails, TournamentFormat, BracketTreeData } from '../types';

export interface OrganizerStats {
  totalHosted: number;
  activeTournaments: number;
  enrolledParticipants: number;
  pendingMatches: number;
}

export interface TournamentDatabaseView {
  overview: Tournament & {
    bannerImage?: string | null;
    prizePool?: string | null;
    structure?: string | null;
  };
  playersTable: Array<{
    slotNumber: number;
    participantId: string;
    userId: string;
    ign: string;
    email: string;
    teamId?: string | null;
    teamName?: string | null;
    status: string;
    seed: number;
    isBanned: boolean;
    registeredAt: string;
    disqualified: boolean;
    disqualifyReason?: string | null;
  }>;
  teamsTable: Array<{
    slotNumber: number;
    teamId: string;
    name: string;
    tag?: string | null;
    inviteCode?: string | null;
    captain: { id: string; username: string; email: string };
    rosterCount: number;
    members: Array<{ userId: string; username: string; role: string }>;
    createdAt: string;
  }>;
  scoreMatrix: {
    rounds: Array<{
      roundId: string;
      roundNumber: number;
      name: string;
      matches: Array<{
        matchId: string;
        matchNumber: number;
        status: string;
        referee?: { id: string; username: string } | null;
        scheduledAt?: string | null;
        completedAt?: string | null;
        results: Array<{
          resultId: string;
          participantId: string;
          competitorName: string;
          score: number;
          kills: number;
          placement?: number | null;
          isWinner: boolean;
        }>;
      }>;
    }>;
    leaderboard: Array<{
      participantId: string;
      competitorName: string;
      wins: number;
      totalScore: number;
      totalKills: number;
    }>;
  };
}

export const tournamentService = {
  // Organizer stats & hosted tournaments
  async getOrganizerStats(): Promise<OrganizerStats> {
    const res = await api.get('/organizer/stats');
    return res.data.data;
  },

  async getOrganizerTournaments(): Promise<Tournament[]> {
    const res = await api.get('/organizer/tournaments');
    return res.data.data;
  },

  async updateTournament(
    tournamentId: string,
    data: {
      title?: string;
      description?: string;
      bannerImage?: string;
      prizePool?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<Tournament> {
    const res = await api.put(`/organizer/tournaments/${tournamentId}`, data);
    return res.data.data;
  },

  async deleteOrganizerTournament(tournamentId: string): Promise<void> {
    await api.delete(`/organizer/tournaments/${tournamentId}`);
  },

  // Dedicated Tournament Database Viewer
  async getTournamentDatabase(tournamentId: string): Promise<TournamentDatabaseView> {
    const res = await api.get(`/organizer/tournaments/${tournamentId}/database`);
    return res.data.data;
  },

  // Submit / Commit Scores
  async submitScores(
    tournamentId: string,
    matchId: string,
    scores: Array<{
      participantId: string;
      score: number;
      kills?: number;
      placement?: number;
      isWinner?: boolean;
    }>
  ): Promise<any> {
    const res = await api.post(`/organizer/tournaments/${tournamentId}/scores`, {
      matchId,
      scores
    });
    return res.data;
  },

  // Complete tournament & lock database
  async completeTournament(tournamentId: string): Promise<Tournament> {
    const res = await api.post(`/organizer/tournaments/${tournamentId}/complete`);
    return res.data.data;
  },

  // Disqualify participant
  async disqualifyParticipant(
    tournamentId: string,
    participantId: string,
    reason?: string
  ): Promise<any> {
    const res = await api.patch(
      `/organizer/tournaments/${tournamentId}/participants/${participantId}/disqualify`,
      { reason }
    );
    return res.data.data;
  },

  // General Tournament operations
  async createTournament(data: {
    title: string;
    slug: string;
    description?: string;
    bannerImage?: string;
    prizePool?: string;
    structure?: string;
    gameId: string;
    format: TournamentFormat;
    maxParticipants: number;
    registrationStartDate: string;
    registrationEndDate: string;
    startDate: string;
    endDate?: string;
    rules?: any;
  }): Promise<Tournament> {
    const res = await api.post('/tournaments', data);
    return res.data.data;
  },

  async getTournamentDetails(id: string): Promise<TournamentDetails> {
    const res = await api.get(`/tournaments/${id}/details`);
    return res.data.data;
  },

  // Public Tournaments Catalog with query filters
  async getPublicTournaments(query?: {
    gameId?: string;
    format?: string;
    status?: string;
    search?: string;
  }): Promise<Tournament[]> {
    const res = await api.get('/tournaments', { params: query });
    return res.data.data;
  },

  // Solo Registration Flow (Direct insertion into TournamentParticipant)
  async registerSolo(tournamentId: string, inGameName?: string): Promise<any> {
    const res = await api.post(`/tournaments/${tournamentId}/register/solo`, { inGameName });
    return res.data;
  },

  // Team Registration Flow: Create Team (Generates 6-character Invite Code)
  async createTeam(
    tournamentId: string,
    data: { name: string; tag?: string; inGameName?: string }
  ): Promise<any> {
    const res = await api.post(`/tournaments/${tournamentId}/teams`, data);
    return res.data;
  },

  // Team Registration Flow: Join Team using 6-character Invite Code
  async joinTeamWithInviteCode(
    tournamentId: string,
    data: { inviteCode: string; inGameName?: string }
  ): Promise<any> {
    const res = await api.post(`/tournaments/${tournamentId}/teams/join`, data);
    return res.data;
  },

  // Withdraw Registration / Disband Team before tournament begins
  async withdrawRegistration(tournamentId: string): Promise<any> {
    const res = await api.delete(`/tournaments/${tournamentId}/register`);
    return res.data;
  },

  // Player Match Hub: Retrieve all tournaments joined by logged-in user
  async getPlayerRegistrations(): Promise<any[]> {
    const res = await api.get('/player/registrations');
    return res.data.data;
  },

  async joinTournament(
    tournamentId: string,
    data: {
      teamName?: string;
      teamTag?: string;
      partnerUserIds?: string[];
    }
  ): Promise<any> {
    const res = await api.post(`/tournaments/${tournamentId}/join`, data);
    return res.data.data;
  },

  // =========================================================================
  // REAL-TIME BRACKET & SCORING ENGINE API
  // =========================================================================

  // Fetch structured bracket tree and live standings
  async getBracket(tournamentId: string): Promise<BracketTreeData> {
    const res = await api.get(`/tournaments/${tournamentId}/bracket`);
    return res.data.data;
  },

  // Generate / Seed bracket fixtures
  async generateBracket(tournamentId: string): Promise<{ success: boolean; message: string }> {
    const res = await api.post(`/tournaments/${tournamentId}/generate-bracket`);
    return res.data;
  },

  // Update a single match score and auto-advance winner
  async updateMatchScore(
    tournamentId: string,
    matchId: string,
    scores: Array<{
      participantId: string;
      score: number;
      kills?: number;
      placement?: number;
      isWinner?: boolean;
    }>
  ): Promise<any> {
    const res = await api.put(`/tournaments/${tournamentId}/matches/${matchId}`, { scores });
    return res.data;
  },

  // Organizer: Publish entire round score matrix with instant WebSocket broadcast
  async publishRound(
    tournamentId: string,
    roundId: string,
    matchScores: Array<{
      matchId: string;
      scores: Array<{
        participantId: string;
        score: number;
        kills?: number;
        placement?: number;
        isWinner?: boolean;
      }>;
    }>
  ): Promise<any> {
    const res = await api.post(`/tournaments/${tournamentId}/publish-round`, {
      roundId,
      matchScores
    });
    return res.data;
  },

  // Check in participant
  async checkInParticipant(tournamentId: string, participantId: string): Promise<any> {
    const res = await api.patch(`/tournaments/${tournamentId}/participants/${participantId}/checkin`);
    return res.data;
  },

  // Bulk check-in all registered participants
  async bulkCheckIn(tournamentId: string): Promise<any> {
    const res = await api.post(`/tournaments/${tournamentId}/checkin-all`);
    return res.data;
  },

  // =========================================================================
  // SUB-DATABASE STREAMING CSV EXPORTS
  // =========================================================================

  // Export Players CSV
  async exportParticipants(tournamentId: string, title = 'tournament'): Promise<void> {
    const res = await api.get(`/tournaments/${tournamentId}/export/participants`, {
      responseType: 'blob'
    });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    const sanitizedTitle = title.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    link.setAttribute('download', `${sanitizedTitle}_players.csv`);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  // Export Teams CSV
  async exportTeams(tournamentId: string, title = 'tournament'): Promise<void> {
    const res = await api.get(`/tournaments/${tournamentId}/export/teams`, {
      responseType: 'blob'
    });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    const sanitizedTitle = title.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    link.setAttribute('download', `${sanitizedTitle}_teams.csv`);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  // Export Scores & Standings CSV
  async exportScores(tournamentId: string, title = 'tournament'): Promise<void> {
    const res = await api.get(`/tournaments/${tournamentId}/export/scores`, {
      responseType: 'blob'
    });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    const sanitizedTitle = title.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    link.setAttribute('download', `${sanitizedTitle}_scoreboard.csv`);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  // =========================================================================
  // OPERATIONAL SAFEGUARDS, ROSTER EDGES & BRACKET RECOVERY
  // =========================================================================

  // Update Tie-Breaker Priority Rules
  async updateTieBreakerRules(tournamentId: string, tieBreakerRules: string[]) {
    const res = await api.patch(`/tournaments/${tournamentId}/tie-breakers`, {
      tieBreakerRules
    });
    return res.data;
  },

  // Award Walkover / Bye
  async awardWalkover(
    tournamentId: string,
    matchId: string,
    data: { winnerParticipantId: string; forfeitParticipantId?: string; reason: string }
  ) {
    const res = await api.post(`/tournaments/${tournamentId}/matches/${matchId}/walkover`, data);
    return res.data;
  },

  // Roll Back Match Advancement & Revert to Scheduled
  async rollbackMatch(tournamentId: string, matchId: string) {
    const res = await api.post(`/tournaments/${tournamentId}/matches/${matchId}/rollback`);
    return res.data;
  },

  // Roll Back Entire Round Scores
  async rollbackRound(tournamentId: string, roundId: string) {
    const res = await api.post(`/tournaments/${tournamentId}/rounds/${roundId}/rollback`);
    return res.data;
  },

  // Roster Substitution (Team Captain or Organizer)
  async substituteTeamPlayer(
    tournamentId: string,
    teamId: string,
    data: { outgoingUserId: string; incomingIdentifier: string; inGameName?: string }
  ) {
    const res = await api.post(`/tournaments/${tournamentId}/teams/${teamId}/substitute`, data);
    return res.data;
  },

  // Set Custom Match Room Credentials (Organizer, Admin, Referee)
  async setMatchCredentials(
    tournamentId: string,
    matchId: string,
    data: { customRoomId: string; customRoomPassword?: string; roomInstructions?: string }
  ) {
    const res = await api.post(`/tournaments/${tournamentId}/matches/${matchId}/credentials`, data);
    return res.data;
  },

  // Get Custom Match Room Credentials (Checked-in Participants, Referee, Organizer, Admin)
  async getMatchCredentials(tournamentId: string, matchId: string) {
    const res = await api.get(`/tournaments/${tournamentId}/matches/${matchId}/credentials`);
    return res.data;
  }
};




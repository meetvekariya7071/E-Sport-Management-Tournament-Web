import api from './axios';
import { Tournament, TournamentDetails, TournamentFormat } from '../types';

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

  // Generate & Seed Tournament Bracket
  async generateBracket(tournamentId: string): Promise<any> {
    const res = await api.post(`/tournaments/${tournamentId}/generate-bracket`);
    return res.data;
  },

  // Update Match Score & Advance Round Winners
  async updateMatchScore(
    tournamentId: string,
    matchId: string,
    data: { scores: any[]; status?: string }
  ): Promise<any> {
    const res = await api.put(`/tournaments/${tournamentId}/matches/${matchId}`, data);
    return res.data;
  },

  // Get Structured Bracket Tree
  async getBracket(tournamentId: string): Promise<any> {
    const res = await api.get(`/tournaments/${tournamentId}/bracket`);
    return res.data.data;
  },

  // Get Live Recalculated Leaderboard
  async getLeaderboard(tournamentId: string): Promise<any[]> {
    const res = await api.get(`/tournaments/${tournamentId}/leaderboard`);
    return res.data.data;
  }
};

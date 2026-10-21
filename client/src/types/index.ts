export type Role = 'ADMIN' | 'ORGANIZER' | 'PLAYER' | 'REFEREE';
export type TournamentFormat = 'SOLO' | 'DUO' | 'SQUAD';
export type TournamentStatus = 'DRAFT' | 'REGISTRATION_OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TournamentLifecycle = 'FUTURE' | 'REGISTRATION_OPEN' | 'LIVE' | 'PAST';
export type ParticipantStatus = 'REGISTERED' | 'CHECKED_IN' | 'DISQUALIFIED' | 'ELIMINATED';

export interface User {
  id: string;
  email: string;
  username: string;
  role: Role;
  isEmailVerified?: boolean;
  isBanned: boolean;
  banReason?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  createdAt?: string;
}

export interface Game {
  id: string;
  title: string;
  slug: string;
  genre: string;
  platform?: string;
  coverImage?: string | null;
  isTeamBased: boolean;
  minTeamSize: number;
  maxTeamSize: number;
  metadata?: any;
  _count?: {
    tournaments: number;
  };
}

export interface Tournament {
  id: string;
  title: string;
  slug: string;
  description?: string;
  bannerImage?: string | null;
  prizePool?: string | null;
  structure?: string;
  rules?: any;
  format: TournamentFormat;
  status: TournamentStatus;
  lifecycleStatus?: TournamentLifecycle;
  maxParticipants: number;
  currentCount: number;
  registrationStartDate: string;
  registrationEndDate: string;
  startDate: string;
  endDate?: string;
  gameId?: string;
  game?: {
    id: string;
    title: string;
    slug: string;
    genre?: string;
    platform?: string;
    isTeamBased?: boolean;
  };
  organizer?: {
    id: string;
    username: string;
    email: string;
  };
  _count?: {
    participants: number;
    teams: number;
    matches: number;
  };
  rounds?: Array<{
    id: string;
    roundNumber: number;
    name: string;
    stage?: string;
    matches?: Array<{
      id: string;
      matchNumber: number;
      status: string;
    }>;
  }>;
}

export interface TournamentDetails extends Tournament {
  teams: Array<{
    id: string;
    name: string;
    tag?: string;
    captain: { id: string; username: string };
    members: Array<{ user: { id: string; username: string } }>;
  }>;
  participants: Array<{
    participantId: string;
    user: { id: string; username: string; email: string };
    team?: { id: string; name: string; tag?: string } | null;
    status: ParticipantStatus;
    seed?: number | null;
    disqualified: boolean;
    disqualifyReason?: string | null;
  }>;
  scheduleAndScores: Array<{
    id: string;
    roundNumber: number;
    name: string;
    matches: Array<{
      id: string;
      matchNumber: number;
      status: string;
      referee?: { id: string; username: string } | null;
      results: Array<{
        score: number;
        kills: number;
        placement?: number;
        isWinner: boolean;
        participant: {
          user: { username: string };
          team?: { name: string } | null;
        };
      }>;
    }>;
  }>;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface PlayerRegistration {
  registrationId: string;
  status: ParticipantStatus;
  inGameName?: string | null;
  registeredAt: string;
  tournament: Tournament & {
    bannerImage?: string | null;
    prizePool?: string | null;
    structure?: string | null;
    rules?: any;
    rounds?: any[];
  };
  team: {
    id: string;
    name: string;
    tag?: string | null;
    inviteCode?: string | null;
    isCaptain: boolean;
    captain: { id: string; username: string; email: string };
    members: Array<{
      userId: string;
      username: string;
      role: string;
      joinedAt: string;
    }>;
  } | null;
}

export interface BracketCompetitor {
  resultId?: string;
  participantId: string;
  name: string;
  tag?: string | null;
  isTeam?: boolean;
  avatarUrl?: string | null;
  score: number;
  kills: number;
  placement?: number | null;
  isWinner: boolean;
  teamRoster?: string[];
}

export interface BracketMatch {
  id: string;
  matchNumber: number;
  roundId: string;
  status: 'PENDING' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'DISPUTED';
  nextMatchId?: string | null;
  nextMatchSlot?: number | null;
  hasCredentials?: boolean;
  customRoomId?: string | null;
  customRoomPassword?: string | null;
  roomInstructions?: string | null;
  scheduledAt?: string | null;
  completedAt?: string | null;
  referee?: { id: string; username: string } | null;
  competitors: BracketCompetitor[];
}

export interface BracketRound {
  id: string;
  roundNumber: number;
  name: string;
  stage?: string | null;
  matches: BracketMatch[];
}

export interface LeaderboardStanding {
  rank: number;
  participantId: string;
  name: string;
  tag?: string | null;
  isTeam: boolean;
  avatarUrl?: string | null;
  totalPoints: number;
  rankPoints: number;
  killPoints: number;
  totalKills: number;
  matchesPlayed: number;
  wins: number;
  bestPlacement?: number | null;
  finalRoundPlacement?: number | null;
  tieBreakerBadge?: string | null;
}

export interface BracketTreeData {
  tournament: Tournament & {
    structure: string;
    tieBreakerRules?: string[];
  };
  rounds: BracketRound[];
  standings: LeaderboardStanding[];
}



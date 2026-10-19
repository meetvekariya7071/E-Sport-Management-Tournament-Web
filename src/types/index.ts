// =========================================================================
// ENUMS & CONSTANTS
// =========================================================================

export const Roles = {
  ADMIN: 'ADMIN',
  ORGANIZER: 'ORGANIZER',
  PLAYER: 'PLAYER',
  REFEREE: 'REFEREE'
} as const;

export type Role = (typeof Roles)[keyof typeof Roles];

export const TournamentFormats = {
  SOLO: 'SOLO',
  DUO: 'DUO',
  SQUAD: 'SQUAD'
} as const;

export type TournamentFormat = (typeof TournamentFormats)[keyof typeof TournamentFormats];

export const TournamentStatuses = {
  DRAFT: 'DRAFT',
  REGISTRATION_OPEN: 'REGISTRATION_OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
} as const;

export type TournamentStatus = (typeof TournamentStatuses)[keyof typeof TournamentStatuses];

export const ParticipantStatuses = {
  REGISTERED: 'REGISTERED',
  CHECKED_IN: 'CHECKED_IN',
  DISQUALIFIED: 'DISQUALIFIED',
  ELIMINATED: 'ELIMINATED'
} as const;

export type ParticipantStatus = (typeof ParticipantStatuses)[keyof typeof ParticipantStatuses];

export const MatchStatuses = {
  PENDING: 'PENDING',
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  DISPUTED: 'DISPUTED'
} as const;

export type MatchStatus = (typeof MatchStatuses)[keyof typeof MatchStatuses];

// =========================================================================
// AUTH & CONTEXT INTERFACES
// =========================================================================

export interface AuthUserPayload {
  id: string;
  email: string;
  username: string;
  role: Role;
  isBanned: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

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
  NO_SHOW: 'NO_SHOW',
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

export const DisputeStatuses = {
  OPEN: 'OPEN',
  INVESTIGATING: 'INVESTIGATING',
  RESOLVED: 'RESOLVED',
  DISMISSED: 'DISMISSED'
} as const;

export type DisputeStatus = (typeof DisputeStatuses)[keyof typeof DisputeStatuses];

export const NotificationTypes = {
  INVITE: 'INVITE',
  MATCH_START: 'MATCH_START',
  SCORE_UPDATE: 'SCORE_UPDATE',
  BAN: 'BAN',
  DISPUTE_UPDATE: 'DISPUTE_UPDATE',
  GENERAL: 'GENERAL'
} as const;

export type NotificationType = (typeof NotificationTypes)[keyof typeof NotificationTypes];

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

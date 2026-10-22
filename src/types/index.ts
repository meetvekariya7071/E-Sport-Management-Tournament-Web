// =========================================================================
// ENUMS & CONSTANTS
// =========================================================================

export const Roles = {
  ADMIN: 'ADMIN',
  ORGANIZER: 'ORGANIZER',
  PLAYER: 'PLAYER'
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

export const TournamentLifecycles = {
  FUTURE: 'FUTURE',
  REGISTRATION_OPEN: 'REGISTRATION_OPEN',
  LIVE: 'LIVE',
  PAST: 'PAST'
} as const;

export type TournamentLifecycle = (typeof TournamentLifecycles)[keyof typeof TournamentLifecycles];

export const ParticipantStatuses = {
  REGISTERED: 'REGISTERED',
  CHECKED_IN: 'CHECKED_IN',
  PRESENT: 'PRESENT',
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

export const TournamentStages = {
  ROUND_OF_16: 'ROUND_OF_16',
  QUARTERFINALS: 'QUARTERFINALS',
  SEMIFINALS: 'SEMIFINALS',
  FINALS: 'FINALS'
} as const;

export type TournamentStage = (typeof TournamentStages)[keyof typeof TournamentStages];

export const DisputeStatuses = {
  OPEN: 'OPEN',
  INVESTIGATING: 'INVESTIGATING',
  RESOLVED: 'RESOLVED',
  DISMISSED: 'DISMISSED'
} as const;

export type DisputeStatus = (typeof DisputeStatuses)[keyof typeof DisputeStatuses];

export const DisputeReasons = {
  CHEATING: 'CHEATING',
  INCORRECT_SCORE: 'INCORRECT_SCORE',
  TOXIC_CONDUCT: 'TOXIC_CONDUCT',
  NO_SHOW: 'NO_SHOW',
  OTHER: 'OTHER'
} as const;

export type DisputeReason = (typeof DisputeReasons)[keyof typeof DisputeReasons];

export const NotificationTypes = {
  INVITE: 'INVITE',
  MATCH_START: 'MATCH_START',
  SCORE_UPDATE: 'SCORE_UPDATE',
  BAN: 'BAN',
  DISPUTE: 'DISPUTE',
  CHECK_IN: 'CHECK_IN',
  SYSTEM: 'SYSTEM'
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

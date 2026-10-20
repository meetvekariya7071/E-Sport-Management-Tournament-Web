export type TournamentLifecycle = 'UPCOMING' | 'REGISTRATION_OPEN' | 'IN_PROGRESS' | 'COMPLETED';

export interface TournamentLifecycleDates {
  registrationStartDate?: Date | string | null;
  registrationEndDate?: Date | string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  status?: string;
  lifecycleStatus?: string;
}

/**
 * Dynamic lifecycle status evaluator for tournaments on the client.
 *
 * Rules:
 * - PAST / COMPLETED: now > endDate (or explicitly marked as COMPLETED).
 * - LIVE / IN_PROGRESS: now > registrationEndDate && (endDate ? now <= endDate : true)
 *   (Registration is closed; matches are actively running).
 * - REGISTRATION_OPEN: now >= registrationStartDate && now <= registrationEndDate
 *   (Players/teams can register).
 * - FUTURE / UPCOMING: now < registrationStartDate
 *   (Registration has not opened yet).
 */
export function evaluateTournamentLifecycle(
  tournament: TournamentLifecycleDates,
  referenceDate: Date = new Date()
): TournamentLifecycle {
  // If explicitly completed or cancelled
  if (tournament.status === 'COMPLETED') {
    return 'COMPLETED';
  }

  const now = referenceDate.getTime();

  // If dates are missing, fallback to status
  if (!tournament.registrationStartDate || !tournament.registrationEndDate || !tournament.startDate) {
    if (tournament.status === 'IN_PROGRESS') return 'IN_PROGRESS';
    if (tournament.status === 'REGISTRATION_OPEN') return 'REGISTRATION_OPEN';
    if (tournament.status === 'UPCOMING') return 'UPCOMING';
    return 'REGISTRATION_OPEN';
  }

  const regStart = new Date(tournament.registrationStartDate).getTime();
  const regEnd = new Date(tournament.registrationEndDate).getTime();
  const end = tournament.endDate ? new Date(tournament.endDate).getTime() : null;

  // 1. PAST / COMPLETED: now > endDate
  if (end !== null && !isNaN(end) && now > end) {
    return 'COMPLETED';
  }

  // 2. LIVE / IN_PROGRESS: now > registrationEndDate && (endDate ? now <= endDate : true)
  if (now > regEnd && (end === null || isNaN(end) || now <= end)) {
    return 'IN_PROGRESS';
  }

  // 3. REGISTRATION_OPEN: now >= registrationStartDate && now <= registrationEndDate
  if (now >= regStart && now <= regEnd) {
    return 'REGISTRATION_OPEN';
  }

  // 4. FUTURE / UPCOMING: now < registrationStartDate
  if (now < regStart) {
    return 'UPCOMING';
  }

  return 'UPCOMING';
}

/**
 * Helper to get days or hours remaining until registration opens
 */
export function getDaysUntilRegistration(registrationStartDate: string | Date, referenceDate: Date = new Date()): number {
  const target = new Date(registrationStartDate).getTime();
  const now = referenceDate.getTime();
  const diff = target - now;
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

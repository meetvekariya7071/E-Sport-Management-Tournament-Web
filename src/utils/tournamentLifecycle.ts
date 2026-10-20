export type TournamentLifecycle = 'UPCOMING' | 'REGISTRATION_OPEN' | 'IN_PROGRESS' | 'COMPLETED';

export interface TournamentLifecycleDates {
  registrationStartDate: Date | string;
  registrationEndDate: Date | string;
  startDate: Date | string;
  endDate?: Date | string | null;
  status?: string;
}

/**
 * Dynamic lifecycle status evaluator for tournaments.
 * 
 * Rules:
 * - PAST / COMPLETED: now > endDate (or explicitly marked as COMPLETED by organizer/referee).
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
  // If explicitly completed
  if (tournament.status === 'COMPLETED') {
    return 'COMPLETED';
  }

  const now = referenceDate.getTime();
  const regStart = new Date(tournament.registrationStartDate).getTime();
  const regEnd = new Date(tournament.registrationEndDate).getTime();
  const end = tournament.endDate ? new Date(tournament.endDate).getTime() : null;

  // PAST / COMPLETED: now > endDate (or explicitly marked as COMPLETED)
  if (end !== null && now > end) {
    return 'COMPLETED';
  }

  // LIVE / IN_PROGRESS: now > registrationEndDate && (endDate ? now <= endDate : true)
  if (now > regEnd && (end === null || now <= end)) {
    return 'IN_PROGRESS';
  }

  // REGISTRATION_OPEN: now >= registrationStartDate && now <= registrationEndDate
  if (now >= regStart && now <= regEnd) {
    return 'REGISTRATION_OPEN';
  }

  // FUTURE / UPCOMING: now < registrationStartDate
  if (now < regStart) {
    return 'UPCOMING';
  }

  return 'UPCOMING';
}

/**
 * Validate chronological sequence of tournament dates:
 * registrationStartDate < registrationEndDate <= startDate < endDate
 */
export function validateTournamentDates(dates: {
  registrationStartDate: Date | string;
  registrationEndDate: Date | string;
  startDate: Date | string;
  endDate?: Date | string | null;
}): { isValid: boolean; error?: string } {
  const regStart = new Date(dates.registrationStartDate).getTime();
  const regEnd = new Date(dates.registrationEndDate).getTime();
  const start = new Date(dates.startDate).getTime();
  const end = dates.endDate ? new Date(dates.endDate).getTime() : null;

  if (isNaN(regStart) || isNaN(regEnd) || isNaN(start)) {
    return { isValid: false, error: 'All dates must be valid ISO date strings.' };
  }

  if (regStart >= regEnd) {
    return { isValid: false, error: 'Registration start date must be strictly before registration end date.' };
  }

  if (regEnd > start) {
    return { isValid: false, error: 'Registration end date must be on or before tournament start date.' };
  }

  if (end !== null) {
    if (isNaN(end)) {
      return { isValid: false, error: 'Tournament end date must be a valid ISO date string.' };
    }
    if (start >= end) {
      return { isValid: false, error: 'Tournament start date must be strictly before tournament end date.' };
    }
  }

  return { isValid: true };
}

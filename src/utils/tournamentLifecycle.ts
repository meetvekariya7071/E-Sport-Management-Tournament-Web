export type TournamentLifecycle = 'FUTURE' | 'REGISTRATION_OPEN' | 'LIVE' | 'PAST';

export interface TournamentLifecycleDates {
  registrationStartDate: Date | string;
  registrationEndDate: Date | string;
  startDate: Date | string;
  endDate?: Date | string | null;
  status?: string | null;
}

/**
 * Dynamically evaluates tournament lifecycle status based on current time and date bounds:
 * - FUTURE / UPCOMING: now < registrationStartDate (Registration has not opened yet).
 * - REGISTRATION_OPEN: now >= registrationStartDate && now <= registrationEndDate (Players/teams can register).
 * - LIVE / IN_PROGRESS: now > registrationEndDate && (endDate ? now <= endDate : true) (Registration is closed; matches are actively running).
 * - PAST / COMPLETED: now > endDate (or explicitly marked as COMPLETED by organizer/referee).
 */
export function getTournamentLifecycleStatus(
  tournament: TournamentLifecycleDates,
  referenceDate: Date = new Date()
): TournamentLifecycle {
  // If explicitly marked as completed or cancelled
  if (tournament.status === 'COMPLETED') {
    return 'PAST';
  }

  const now = referenceDate.getTime();
  const regStart = new Date(tournament.registrationStartDate).getTime();
  const regEnd = new Date(tournament.registrationEndDate).getTime();
  const start = new Date(tournament.startDate).getTime();
  const end = tournament.endDate ? new Date(tournament.endDate).getTime() : null;

  // PAST / COMPLETED: now > endDate
  if (end !== null && !isNaN(end) && now > end) {
    return 'PAST';
  }

  // FUTURE / UPCOMING: now < registrationStartDate
  if (!isNaN(regStart) && now < regStart) {
    return 'FUTURE';
  }

  // REGISTRATION_OPEN: now >= registrationStartDate && now <= registrationEndDate
  if (!isNaN(regStart) && !isNaN(regEnd) && now >= regStart && now <= regEnd) {
    return 'REGISTRATION_OPEN';
  }

  // LIVE / IN_PROGRESS: now > registrationEndDate && (endDate ? now <= endDate : true)
  if (!isNaN(regEnd) && now > regEnd && (end === null || now <= end)) {
    return 'LIVE';
  }

  // Fallback if end date is passed
  if (end !== null && !isNaN(end) && now > end) {
    return 'PAST';
  }

  return 'LIVE';
}

/**
 * Enforces chronological date validations:
 * - registrationStartDate < registrationEndDate
 * - registrationEndDate <= startDate
 * - startDate < endDate (if endDate provided)
 */
export function validateTournamentDates(dates: {
  registrationStartDate: Date | string;
  registrationEndDate: Date | string;
  startDate: Date | string;
  endDate?: Date | string | null;
}): { valid: boolean; error?: string } {
  const regStart = new Date(dates.registrationStartDate).getTime();
  const regEnd = new Date(dates.registrationEndDate).getTime();
  const start = new Date(dates.startDate).getTime();
  const end = dates.endDate ? new Date(dates.endDate).getTime() : null;

  if (isNaN(regStart)) {
    return { valid: false, error: 'Registration start date must be a valid date' };
  }
  if (isNaN(regEnd)) {
    return { valid: false, error: 'Registration end date must be a valid date' };
  }
  if (isNaN(start)) {
    return { valid: false, error: 'Tournament start date must be a valid date' };
  }
  if (dates.endDate && isNaN(end!)) {
    return { valid: false, error: 'Tournament end date must be a valid date' };
  }

  // registrationStartDate < registrationEndDate
  if (regStart >= regEnd) {
    return {
      valid: false,
      error: 'Registration start date must be strictly before registration end date.'
    };
  }

  // registrationEndDate <= startDate
  if (regEnd > start) {
    return {
      valid: false,
      error: 'Registration end date must be on or before the tournament start date.'
    };
  }

  // startDate < endDate
  if (end !== null && start >= end) {
    return {
      valid: false,
      error: 'Tournament start date must be strictly before tournament end date.'
    };
  }

  return { valid: true };
}

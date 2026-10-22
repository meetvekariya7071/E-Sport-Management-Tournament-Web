export type TournamentLifecycle = 'FUTURE' | 'REGISTRATION_OPEN' | 'LIVE' | 'PAST';

export interface TournamentLifecycleDates {
  registrationStartDate?: Date | string | null;
  registrationEndDate?: Date | string | null;
  startDate: Date | string;
  endDate?: Date | string | null;
  status?: string | null;
}

/**
 * Dynamically evaluates tournament lifecycle status based on current time and date bounds:
 * - FUTURE / UPCOMING: now < registrationStartDate (Registration has not opened yet).
 * - REGISTRATION_OPEN: now >= registrationStartDate && now <= registrationEndDate (Players/teams can register).
 * - LIVE / IN_PROGRESS: now > registrationEndDate && (endDate ? now <= endDate : true) (Registration is closed; matches are actively running).
 * - PAST / COMPLETED: now > endDate (or explicitly marked as COMPLETED by organizer).
 */
export function getTournamentLifecycleStatus(
  tournament: TournamentLifecycleDates,
  referenceDate: Date = new Date()
): TournamentLifecycle {
  // If explicitly completed or cancelled
  if (tournament.status === 'COMPLETED') {
    return 'PAST';
  }

  const now = referenceDate.getTime();
  const regStart = tournament.registrationStartDate
    ? new Date(tournament.registrationStartDate).getTime()
    : NaN;
  const regEnd = tournament.registrationEndDate
    ? new Date(tournament.registrationEndDate).getTime()
    : NaN;
  const start = new Date(tournament.startDate).getTime();
  const end = tournament.endDate ? new Date(tournament.endDate).getTime() : null;

  // PAST / COMPLETED: now > endDate or explicit COMPLETED/CANCELLED
  if (tournament.status === 'COMPLETED' || tournament.status === 'CANCELLED') {
    return 'PAST';
  }

  if (end !== null && !isNaN(end) && now > end) {
    return 'PAST';
  }

  // FUTURE / UPCOMING: explicit UPCOMING status or now < registrationStartDate or now < start (before kickoff)
  if (
    tournament.status === 'UPCOMING' ||
    (!isNaN(regStart) && now < regStart) ||
    (!isNaN(start) && now < start && tournament.status !== 'IN_PROGRESS')
  ) {
    return 'FUTURE';
  }

  // REGISTRATION_OPEN: now >= registrationStartDate && now <= registrationEndDate
  if (!isNaN(regStart) && !isNaN(regEnd) && now >= regStart && now <= regEnd) {
    return 'REGISTRATION_OPEN';
  }

  // LIVE / IN_PROGRESS: explicit IN_PROGRESS status or actively within kickoff and end window
  if (
    tournament.status === 'IN_PROGRESS' ||
    tournament.status === 'LIVE' ||
    (!isNaN(start) && now >= start && (end === null || now <= end))
  ) {
    return 'LIVE';
  }

  // Fallback
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
  if (!dates.registrationStartDate) {
    return { valid: false, error: 'Registration start date is required.' };
  }
  if (!dates.registrationEndDate) {
    return { valid: false, error: 'Registration end date is required.' };
  }
  if (!dates.startDate) {
    return { valid: false, error: 'Tournament start date is required.' };
  }

  const regStart = new Date(dates.registrationStartDate).getTime();
  const regEnd = new Date(dates.registrationEndDate).getTime();
  const start = new Date(dates.startDate).getTime();
  const end = dates.endDate ? new Date(dates.endDate).getTime() : null;

  if (isNaN(regStart)) return { valid: false, error: 'Registration start date is invalid.' };
  if (isNaN(regEnd)) return { valid: false, error: 'Registration end date is invalid.' };
  if (isNaN(start)) return { valid: false, error: 'Tournament start date is invalid.' };
  if (dates.endDate && isNaN(end!)) return { valid: false, error: 'Tournament end date is invalid.' };

  // registrationStartDate < registrationEndDate
  if (regStart >= regEnd) {
    return {
      valid: false,
      error: 'Registration start date must be strictly earlier than registration end date.'
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
      error: 'Tournament start date must be strictly earlier than tournament end date.'
    };
  }

  return { valid: true };
}

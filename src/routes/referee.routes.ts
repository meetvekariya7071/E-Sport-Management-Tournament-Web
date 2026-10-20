import { Router } from 'express';
import { RefereeController } from '../controllers/referee.controller';
import { DisputeController } from '../controllers/dispute.controller';
import { authenticate, authorizeRoles } from '../middlewares/auth.middleware';
import { Roles } from '../types';

const router = Router();

// Guarded for Referees, Admins, and Organizers
router.use(authenticate, authorizeRoles([Roles.REFEREE, Roles.ADMIN, Roles.ORGANIZER]));

// 1. View assigned matches with KPI metrics
router.get('/matches', RefereeController.getAssignedMatches);

// 2. Match Control Room data & roster checklist
router.get('/matches/:id', RefereeController.getMatchControlRoom);

// 3. Match attendance toggling (Present, Late, No-Show, Disqualified) & substitute approval
router.patch('/matches/:id/checkin', RefereeController.updateMatchCheckin);

// 4. Lock Roster & Start Match / Update match status
router.patch('/matches/:id/status', RefereeController.updateMatchStatus);

// 5. Scorecard verification: One-click & Review with Overrides
router.patch('/matches/:id/verify', RefereeController.verifyMatchScorecard);
router.post('/matches/:id/verify-score', RefereeController.verifyScorecardWithOverride);

// 6. Tournament check-in roster
router.get('/tournaments/:id/participants', RefereeController.getTournamentRoster);

// 7. Participant check-in checklist (Tournament level)
router.patch('/tournaments/:id/participants/:participantId/check-in', RefereeController.updateParticipantCheckIn);

// 8. Read-only inspection of 2-tab (Solo) or 3-tab (Duo/Squad) Tournament Sub-Database
router.get('/tournaments/:id/database', RefereeController.getTournamentDatabase);

// 9. Dispute Resolution Queue & Action Suite
router.get('/disputes', RefereeController.getRefereeDisputes);
router.patch('/disputes/:disputeId', RefereeController.resolveRefereeDispute);

// 10. Disciplinary & Flagging Actions (Warning, Match Disqualification, Escalate Admin)
router.post('/players/:id/sanction', RefereeController.sanctionPlayer);

export default router;

import { Router } from 'express';
import { RefereeController } from '../controllers/referee.controller';
import { DisputeController } from '../controllers/dispute.controller';
import { authenticate, authorizeRoles } from '../middlewares/auth.middleware';
import { Roles } from '../types';

const router = Router();

// Guarded for Referees, Admins, and Organizers
router.use(authenticate, authorizeRoles([Roles.REFEREE, Roles.ADMIN, Roles.ORGANIZER]));

// View assigned matches
router.get('/matches', RefereeController.getAssignedMatches);

// One-click scorecard verification to flag scores as officially validated
router.patch('/matches/:id/verify', RefereeController.verifyMatchScorecard);

// Tournament check-in roster
router.get('/tournaments/:id/participants', RefereeController.getTournamentRoster);

// Participant check-in checklist: Mark players as 'CHECKED_IN' (Present), 'NO_SHOW', or 'DISQUALIFIED'
router.patch('/tournaments/:id/participants/:participantId/check-in', RefereeController.updateParticipantCheckIn);

// Disputes review board for referees
router.get('/disputes', DisputeController.getAllDisputes);

export default router;

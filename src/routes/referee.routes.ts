import { Router } from 'express';
import { RefereeController } from '../controllers/referee.controller';
import { authenticate, authorizeRoles } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import {
  verifyScoreSchema,
  updateDisputeSchema,
  sanctionPlayerSchema
} from '../validators/referee.validator';
import { Roles } from '../types';

const router = Router();

// Referee & Tournament Staff access
router.use(authenticate, authorizeRoles([Roles.REFEREE, Roles.ORGANIZER, Roles.ADMIN]));

// Match Score Verification Endpoints
router.get('/matches', RefereeController.getAssignedMatches);
router.get('/matches/:id', RefereeController.getMatchById);
router.post('/matches/:id/verify-score', validateBody(verifyScoreSchema), RefereeController.verifyMatchScore);
router.patch('/matches/:id/verify', validateBody(verifyScoreSchema), RefereeController.verifyMatchScorecard);

// Dispute Resolution Queue
router.get('/disputes', RefereeController.getAssignedDisputes);
router.patch('/disputes/:disputeId', validateBody(updateDisputeSchema), RefereeController.resolveDispute);

// Disciplinary & Flagging Actions
router.post('/players/:id/sanction', validateBody(sanctionPlayerSchema), RefereeController.sanctionPlayer);

// Participant Check-In Checklist
router.get('/tournaments/:id/check-in', RefereeController.getCheckInList);
router.patch('/participants/:id/status', RefereeController.updateParticipantStatus);

export default router;

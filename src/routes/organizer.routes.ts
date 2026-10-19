import { Router } from 'express';
import { TournamentController } from '../controllers/tournament.controller';
import {
  authenticate,
  authorizeRoles,
  verifyTournamentOwnerOrAdmin
} from '../middlewares/auth.middleware';
import { Roles } from '../types';

const router = Router();

// Apply auth & role guards (Organizer & Admin only)
router.use(authenticate, authorizeRoles([Roles.ORGANIZER, Roles.ADMIN]));

// Organizer Workspace Stats
router.get('/stats', TournamentController.getOrganizerStats);

// My Tournaments Table
router.get('/tournaments', TournamentController.getOrganizerTournaments);

// Tournament Management (Scoped with Ownership Validation)
router.put('/tournaments/:id', verifyTournamentOwnerOrAdmin, TournamentController.updateTournament);
router.delete('/tournaments/:id', verifyTournamentOwnerOrAdmin, TournamentController.deleteTournament);

// Dedicated Tournament Database Viewer
router.get('/tournaments/:id/database', verifyTournamentOwnerOrAdmin, TournamentController.getTournamentDatabase);

// Scores & Results Submission
router.post('/tournaments/:id/scores', verifyTournamentOwnerOrAdmin, TournamentController.submitScores);

// Complete Tournament & Archive Database
router.post('/tournaments/:id/complete', verifyTournamentOwnerOrAdmin, TournamentController.completeTournament);

// Disqualify Player within Tournament
router.patch(
  '/tournaments/:id/participants/:playerId/disqualify',
  verifyTournamentOwnerOrAdmin,
  TournamentController.disqualifyParticipant
);

export default router;

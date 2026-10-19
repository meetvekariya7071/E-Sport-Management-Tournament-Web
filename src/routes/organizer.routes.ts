import { Router } from 'express';
import { TournamentController } from '../controllers/tournament.controller';
import {
  authenticate,
  authorizeRoles,
  verifyTournamentOwnerOrAdmin
} from '../middlewares/auth.middleware';
import { Roles } from '../types';
import { cacheService } from '../services/cache.service';

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

// Dedicated Tournament Database Viewer (cached for 10s)
router.get(
  '/tournaments/:id/database',
  verifyTournamentOwnerOrAdmin,
  cacheService.middleware(10),
  TournamentController.getTournamentDatabase
);

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

// Streaming Sub-Database Exports
router.get('/tournaments/:id/export/participants', verifyTournamentOwnerOrAdmin, TournamentController.exportParticipants);
router.get('/tournaments/:id/export/teams', verifyTournamentOwnerOrAdmin, TournamentController.exportTeams);
router.get('/tournaments/:id/export/scores', verifyTournamentOwnerOrAdmin, TournamentController.exportScores);

export default router;

import { Router } from 'express';
import { TournamentController } from '../controllers/tournament.controller';
import { DisputeController } from '../controllers/dispute.controller';
import { RefereeController } from '../controllers/referee.controller';
import {
  authenticate,
  authorizeRoles,
  verifyTournamentOwnerOrAdmin
} from '../middlewares/auth.middleware';
import { Roles } from '../types';
import { cacheService } from '../services/cache.service';
import { validateRequest } from '../middlewares/validate.middleware';
import {
  createTournamentSchema,
  registerSoloSchema,
  createTeamSchema,
  joinTeamSchema,
  updateMatchScoreSchema
} from '../validators/tournament.validator';

const router = Router();

// Public Tournament Discovery Catalog (filter by gameId, format, status, search with 15s in-memory cache)
router.get('/', cacheService.middleware(15), TournamentController.getPublicTournaments);

// Retrieve Tournament Details (with 15s in-memory cache)
router.get('/:id', cacheService.middleware(15), TournamentController.getTournamentDetails);
router.get('/:id/details', cacheService.middleware(15), TournamentController.getTournamentDetails);

// Assign Referee to Tournament or Specific Match (Admin & Organizer only)
router.post(
  '/:id/assign-referee',
  authenticate,
  authorizeRoles([Roles.ADMIN, Roles.ORGANIZER]),
  verifyTournamentOwnerOrAdmin,
  RefereeController.assignReferee
);

// Create Tournament (Admin & Organizer only)
router.post(
  '/',
  authenticate,
  authorizeRoles([Roles.ADMIN, Roles.ORGANIZER]),
  validateRequest(createTournamentSchema),
  TournamentController.createTournament
);

// Solo Registration Flow (Direct insertion into TournamentParticipant)
router.post(
  '/:id/register/solo',
  authenticate,
  authorizeRoles([Roles.PLAYER, Roles.ADMIN, Roles.ORGANIZER]),
  validateRequest(registerSoloSchema),
  TournamentController.registerSolo
);

// Team Registration Flow: Create Team (Generates 6-char Invite Code)
router.post(
  '/:id/teams',
  authenticate,
  authorizeRoles([Roles.PLAYER, Roles.ADMIN, Roles.ORGANIZER]),
  validateRequest(createTeamSchema),
  TournamentController.createTeam
);

// Team Registration Flow: Join Team using Invite Code
router.post(
  '/:id/teams/join',
  authenticate,
  authorizeRoles([Roles.PLAYER, Roles.ADMIN, Roles.ORGANIZER]),
  validateRequest(joinTeamSchema),
  TournamentController.joinTeamWithInviteCode
);

// Withdraw Registration / Disband Team before tournament begins
router.delete(
  '/:id/register',
  authenticate,
  authorizeRoles([Roles.PLAYER, Roles.ADMIN, Roles.ORGANIZER]),
  TournamentController.withdrawRegistration
);

// Player Registration (Legacy fallback)
router.post(
  '/:id/join',
  authenticate,
  authorizeRoles([Roles.PLAYER, Roles.ADMIN]),
  TournamentController.joinTournament
);

// Disqualify Participant (Organizer of tournament or Admin)
router.post(
  '/:tournamentId/participants/:participantId/disqualify',
  authenticate,
  authorizeRoles([Roles.ADMIN, Roles.ORGANIZER]),
  verifyTournamentOwnerOrAdmin,
  TournamentController.disqualifyParticipant
);

// Bracket Generation & Seeding
router.post(
  '/:id/generate-bracket',
  authenticate,
  authorizeRoles([Roles.ADMIN, Roles.ORGANIZER]),
  TournamentController.generateBracket
);

// Real-Time Match Scoring & Round Advancement
router.put(
  '/:id/matches/:matchId',
  authenticate,
  authorizeRoles([Roles.ADMIN, Roles.ORGANIZER]),
  validateRequest(updateMatchScoreSchema),
  TournamentController.updateMatchScore
);

// Structured Bracket Tree (cached for 10s during match spikes)
router.get('/:id/bracket', cacheService.middleware(10), TournamentController.getBracket);

// Live Recalculated Leaderboard (cached for 10s during match spikes)
router.get('/:id/leaderboard', cacheService.middleware(10), TournamentController.getLeaderboard);

// Streaming CSV Export Endpoints (Admin & Organizer)
// GET /api/tournaments/:id/export/participants
router.get(
  '/:id/export/participants',
  authenticate,
  authorizeRoles([Roles.ADMIN, Roles.ORGANIZER]),
  verifyTournamentOwnerOrAdmin,
  TournamentController.exportParticipants
);

// GET /api/tournaments/:id/export/teams
router.get(
  '/:id/export/teams',
  authenticate,
  authorizeRoles([Roles.ADMIN, Roles.ORGANIZER]),
  verifyTournamentOwnerOrAdmin,
  TournamentController.exportTeams
);

// GET /api/tournaments/:id/export/scores
router.get(
  '/:id/export/scores',
  authenticate,
  authorizeRoles([Roles.ADMIN, Roles.ORGANIZER]),
  verifyTournamentOwnerOrAdmin,
  TournamentController.exportScores
);

// Tournament Disputes Engine
// POST /api/tournaments/:id/disputes - Player raises a dispute
router.post(
  '/:id/disputes',
  authenticate,
  DisputeController.createDispute
);

// GET /api/tournaments/:id/disputes - Retrieve all disputes scoped to this tournament
router.get(
  '/:id/disputes',
  authenticate,
  DisputeController.getTournamentDisputes
);

export default router;

import { Router } from 'express';
import { TournamentController } from '../controllers/tournament.controller';
import { DisputeController } from '../controllers/dispute.controller';
import {
  authenticate,
  authorizeRoles,
  verifyTournamentOwnerOrAdmin
} from '../middlewares/auth.middleware';
import { cacheRoute } from '../services/cache.service';
import { Roles } from '../types';
import { tournamentRateLimiter } from '../middlewares/rateLimiter.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import {
  createTournamentSchema,
  createTeamSchema,
  joinTeamSchema,
  registerSoloSchema,
  updateMatchScoreSchema,
  publishRoundSchema
} from '../validators/tournament.validator';

const router = Router();

// Apply tournament rate limiter
router.use(tournamentRateLimiter);

// Public Tournament Discovery Catalog (filter by gameId, format, status, search) - Cached 15s
router.get('/', cacheRoute('catalog', 15), TournamentController.getPublicTournaments);

// Retrieve Tournament Details - Cached 20s
router.get('/:id', cacheRoute('details', 20), TournamentController.getTournamentDetails);
router.get('/:id/details', cacheRoute('details', 20), TournamentController.getTournamentDetails);

// Create Tournament (Admin & Organizer only)
router.post(
  '/',
  authenticate,
  authorizeRoles([Roles.ADMIN, Roles.ORGANIZER]),
  validateBody(createTournamentSchema),
  TournamentController.createTournament
);

// Solo Registration Flow (Direct insertion into TournamentParticipant)
router.post(
  '/:id/register/solo',
  authenticate,
  authorizeRoles([Roles.PLAYER, Roles.ADMIN, Roles.ORGANIZER]),
  validateBody(registerSoloSchema),
  TournamentController.registerSolo
);

// Team Registration Flow: Create Team (Generates 6-char Invite Code)
router.post(
  '/:id/teams',
  authenticate,
  authorizeRoles([Roles.PLAYER, Roles.ADMIN, Roles.ORGANIZER]),
  validateBody(createTeamSchema),
  TournamentController.createTeam
);

// Team Registration Flow: Join Team using Invite Code
router.post(
  '/:id/teams/join',
  authenticate,
  authorizeRoles([Roles.PLAYER, Roles.ADMIN, Roles.ORGANIZER]),
  validateBody(joinTeamSchema),
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

// =========================================================================
// REAL-TIME BRACKET & MATCH SCORING ENGINE ROUTES
// =========================================================================

// GET /api/tournaments/:id/bracket - Returns structured match tree for frontend rendering (Cached 15s)
router.get('/:id/bracket', cacheRoute('bracket', 15), TournamentController.getTournamentBracket);

// POST /api/tournaments/:id/generate-bracket - Randomly seeds participants into Round 1 fixtures
router.post(
  '/:id/generate-bracket',
  authenticate,
  authorizeRoles([Roles.ADMIN, Roles.ORGANIZER]),
  verifyTournamentOwnerOrAdmin,
  TournamentController.generateBracket
);

// PUT /api/tournaments/:id/matches/:matchId - Commits match scores, advances winners, and broadcasts
router.put(
  '/:id/matches/:matchId',
  authenticate,
  authorizeRoles([Roles.ADMIN, Roles.ORGANIZER]),
  verifyTournamentOwnerOrAdmin,
  validateBody(updateMatchScoreSchema),
  TournamentController.updateMatchScore
);

// POST /api/tournaments/:id/publish-round - Organizers publish round matrix and fires WebSocket
router.post(
  '/:id/publish-round',
  authenticate,
  authorizeRoles([Roles.ADMIN, Roles.ORGANIZER]),
  verifyTournamentOwnerOrAdmin,
  validateBody(publishRoundSchema),
  TournamentController.publishRound
);

// Check-in player (Single & Bulk)
router.patch(
  '/:id/participants/:participantId/checkin',
  authenticate,
  authorizeRoles([Roles.ADMIN, Roles.ORGANIZER]),
  verifyTournamentOwnerOrAdmin,
  TournamentController.checkInParticipant
);

router.post(
  '/:id/checkin-all',
  authenticate,
  authorizeRoles([Roles.ADMIN, Roles.ORGANIZER]),
  verifyTournamentOwnerOrAdmin,
  TournamentController.bulkCheckIn
);

// =========================================================================
// SUB-DATABASE STREAMING CSV EXPORTS (Admin & Organizer)
// =========================================================================

// Export Participants CSV
router.get(
  '/:id/export/participants',
  authenticate,
  authorizeRoles([Roles.ADMIN, Roles.ORGANIZER]),
  verifyTournamentOwnerOrAdmin,
  TournamentController.exportParticipants
);

// Export Teams CSV (DUO/SQUAD)
router.get(
  '/:id/export/teams',
  authenticate,
  authorizeRoles([Roles.ADMIN, Roles.ORGANIZER]),
  verifyTournamentOwnerOrAdmin,
  TournamentController.exportTeams
);

// Export Scores & Standings CSV
router.get(
  '/:id/export/scores',
  authenticate,
  authorizeRoles([Roles.ADMIN, Roles.ORGANIZER]),
  verifyTournamentOwnerOrAdmin,
  TournamentController.exportScores
);

// =========================================================================
// TOURNAMENT MATCH DISPUTES (Player Raise & Review)
// =========================================================================

// POST /api/tournaments/:id/disputes - Player raises a dispute
router.post(
  '/:id/disputes',
  authenticate,
  DisputeController.createDispute
);

// GET /api/tournaments/:id/disputes - Retrieve tournament disputes
router.get(
  '/:id/disputes',
  authenticate,
  DisputeController.getTournamentDisputes
);

// =========================================================================
// OPERATIONAL SAFEGUARDS, ROSTER EDGES & BRACKET RECOVERY ROUTES
// =========================================================================

// Configure / Reorder Tie-Breaker Priority Rules
router.patch(
  '/:id/tie-breakers',
  authenticate,
  authorizeRoles([Roles.ADMIN, Roles.ORGANIZER]),
  verifyTournamentOwnerOrAdmin,
  TournamentController.updateTieBreakerRules
);

// Award Walkover / Bye in Elimination Bracket
router.post(
  '/:id/matches/:matchId/walkover',
  authenticate,
  authorizeRoles([Roles.ADMIN, Roles.ORGANIZER]),
  verifyTournamentOwnerOrAdmin,
  TournamentController.awardWalkover
);

// Match Reschedule & Bracket Advancement Rollback
router.post(
  '/:id/matches/:matchId/rollback',
  authenticate,
  authorizeRoles([Roles.ADMIN, Roles.ORGANIZER]),
  verifyTournamentOwnerOrAdmin,
  TournamentController.rollbackMatch
);

// Round Score Rollback
router.post(
  '/:id/rounds/:roundId/rollback',
  authenticate,
  authorizeRoles([Roles.ADMIN, Roles.ORGANIZER]),
  verifyTournamentOwnerOrAdmin,
  TournamentController.rollbackRound
);

// Roster Substitution (Team Captain, Organizer, or Admin)
router.post(
  '/:id/teams/:teamId/substitute',
  authenticate,
  authorizeRoles([Roles.PLAYER, Roles.ADMIN, Roles.ORGANIZER]),
  TournamentController.substituteTeamPlayer
);

// Set Custom Match Room Credentials (Organizer, Admin)
router.post(
  '/:id/matches/:matchId/credentials',
  authenticate,
  authorizeRoles([Roles.ADMIN, Roles.ORGANIZER]),
  TournamentController.setMatchCredentials
);

// Get Custom Match Room Credentials (Checked-in Participants, Organizer, Admin)
router.get(
  '/:id/matches/:matchId/credentials',
  authenticate,
  TournamentController.getMatchCredentials
);

export default router;




import { Router } from 'express';
import { TournamentController } from '../controllers/tournament.controller';
import {
  authenticate,
  authorizeRoles,
  verifyTournamentOwnerOrAdmin
} from '../middlewares/auth.middleware';
import { Roles } from '../types';

const router = Router();

// Public Tournament Discovery Catalog (filter by gameId, format, status, search)
router.get('/', TournamentController.getPublicTournaments);

// Retrieve Tournament Details
router.get('/:id', TournamentController.getTournamentDetails);
router.get('/:id/details', TournamentController.getTournamentDetails);

// Create Tournament (Admin & Organizer only)
router.post(
  '/',
  authenticate,
  authorizeRoles([Roles.ADMIN, Roles.ORGANIZER]),
  TournamentController.createTournament
);

// Solo Registration Flow (Direct insertion into TournamentParticipant)
router.post(
  '/:id/register/solo',
  authenticate,
  authorizeRoles([Roles.PLAYER, Roles.ADMIN, Roles.ORGANIZER]),
  TournamentController.registerSolo
);

// Team Registration Flow: Create Team (Generates 6-char Invite Code)
router.post(
  '/:id/teams',
  authenticate,
  authorizeRoles([Roles.PLAYER, Roles.ADMIN, Roles.ORGANIZER]),
  TournamentController.createTeam
);

// Team Registration Flow: Join Team using Invite Code
router.post(
  '/:id/teams/join',
  authenticate,
  authorizeRoles([Roles.PLAYER, Roles.ADMIN, Roles.ORGANIZER]),
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

export default router;

import { Router } from 'express';
import { TournamentController } from '../controllers/tournament.controller';
import { authenticate, authorizeRoles } from '../middlewares/auth.middleware';
import { Roles } from '../types';

const router = Router();

// Apply auth to all player routes
router.use(authenticate, authorizeRoles([Roles.PLAYER, Roles.ADMIN, Roles.ORGANIZER]));

// GET /api/player/registrations & GET /api/player/tournaments - Retrieves all tournaments joined by the logged-in user
router.get('/registrations', TournamentController.getPlayerRegistrations);
router.get('/tournaments', TournamentController.getPlayerRegistrations);

export default router;

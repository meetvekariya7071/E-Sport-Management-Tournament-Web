import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authRateLimiter } from '../middlewares/rateLimiter.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { requestEmailChangeSchema, confirmEmailChangeSchema } from '../validators/auth.validator';

import { TournamentController } from '../controllers/tournament.controller';

const router = Router();

// GET /api/user/me/tournaments & /api/users/me/tournaments
router.get('/me/tournaments', authenticate, TournamentController.getPlayerRegistrations);

// Authenticated user email update endpoints
router.post(
  '/request-email-change',
  authenticate,
  authRateLimiter,
  validateBody(requestEmailChangeSchema),
  UserController.requestEmailChange
);

router.post(
  '/confirm-email-change',
  authenticate,
  authRateLimiter,
  validateBody(confirmEmailChangeSchema),
  UserController.confirmEmailChange
);

router.delete(
  '/account',
  authenticate,
  authRateLimiter,
  UserController.deleteAccount
);

export default router;

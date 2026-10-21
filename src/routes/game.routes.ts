import { Router } from 'express';
import { GameController } from '../controllers/game.controller';
import { authenticate, authorizeRoles } from '../middlewares/auth.middleware';
import { Roles } from '../types';

const router = Router();

// Public: Browse all games
router.get('/', GameController.getAllGames);

// Admin-Only: Add new game to catalog
router.post(
  '/',
  authenticate,
  authorizeRoles([Roles.ADMIN]),
  GameController.createGame
);

// Admin-Only: Update game details
router.put(
  '/:id',
  authenticate,
  authorizeRoles([Roles.ADMIN]),
  GameController.updateGame
);

// Admin-Only: Delete game
router.delete(
  '/:id',
  authenticate,
  authorizeRoles([Roles.ADMIN]),
  GameController.deleteGame
);

export default router;

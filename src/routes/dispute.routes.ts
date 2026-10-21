import { Router } from 'express';
import { DisputeController } from '../controllers/dispute.controller';
import { authenticate, authorizeRoles } from '../middlewares/auth.middleware';
import { Roles } from '../types';

const router = Router();

// Base authentication for all dispute interactions
router.use(authenticate);

// Get disputes for current user (player sees theirs, staff sees assigned)
router.get('/', DisputeController.getUserDisputes);

// Resolve dispute (Referee, Organizer, Admin)
router.patch(
  '/:disputeId/resolve',
  authorizeRoles([Roles.REFEREE, Roles.ORGANIZER, Roles.ADMIN]),
  DisputeController.resolveDispute
);

export default router;

import { Router } from 'express';
import { DisputeController } from '../controllers/dispute.controller';
import { authenticate, authorizeRoles } from '../middlewares/auth.middleware';
import { Roles } from '../types';

const router = Router();

// Review Board & Resolution endpoints (Organizer, Referee, Admin)
router.use(authenticate, authorizeRoles([Roles.ADMIN, Roles.ORGANIZER, Roles.REFEREE]));

// GET /api/disputes - Filter disputes across tournaments
router.get('/', DisputeController.getAllDisputes);

// PATCH /api/disputes/:disputeId/resolve - Resolve dispute and optionally overwrite score
router.patch('/:disputeId/resolve', DisputeController.resolveDispute);

export default router;

import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authenticate, authorizeRoles } from '../middlewares/auth.middleware';
import { Roles } from '../types';

const router = Router();

// Apply Admin guard to all admin routes
router.use(authenticate, authorizeRoles([Roles.ADMIN]));

// KPI Summary
router.get('/kpis', AdminController.getKPISummary);
router.get('/overview', AdminController.getAdminOverview);

// System Database Tables with Pagination, Search, and Sorting
router.get('/tables/:table', AdminController.getTableData);

// User Governance & Moderation (Ban/Unban)
router.patch('/users/:id/status', AdminController.updateUserStatus);
router.patch('/users/:id/ban', AdminController.updateUserStatus);

// Game Catalog Management (Admin Only)
router.post('/games', AdminController.createGame);
router.put('/games/:id', AdminController.updateGame);
router.delete('/games/:id', AdminController.deleteGame);

// Tournament Management & Inspector (Admin Force Operations)
router.delete('/tournaments/:id', AdminController.deleteTournament);
router.get('/tournaments/:id/inspect', AdminController.inspectTournament);

export default router;

import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// All notification routes require authenticated user
router.use(authenticate);

// GET /api/notifications
router.get('/', NotificationController.getNotifications);

// PATCH /api/notifications/:id/read
router.patch('/:id/read', NotificationController.markRead);

// PATCH /api/notifications/read-all
router.patch('/read-all', NotificationController.markAllRead);

export default router;

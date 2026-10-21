import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

router.get('/', NotificationController.getUserNotifications);
router.get('/unread-count', NotificationController.getUnreadCount);
router.patch('/read-all', NotificationController.markAllAsRead);
router.patch('/:id/read', NotificationController.markAsRead);

export default router;

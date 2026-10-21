import { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service';

export class NotificationController {
  /**
   * GET /api/notifications
   */
  static async getUserNotifications(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { page, limit, unreadOnly } = req.query;
      const result = await NotificationService.getUserNotifications(userId, {
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
        unreadOnly: unreadOnly === 'true'
      });

      res.status(200).json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Failed to fetch notifications' });
    }
  }

  /**
   * GET /api/notifications/unread-count
   */
  static async getUnreadCount(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const count = await NotificationService.getUnreadCount(userId);
      res.status(200).json({ success: true, data: { unreadCount: count } });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Failed to fetch unread count' });
    }
  }

  /**
   * PATCH /api/notifications/:id/read
   */
  static async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const success = await NotificationService.markAsRead(id, userId);
      res.status(200).json({ success, message: success ? 'Notification marked as read' : 'Notification not found' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Failed to update notification' });
    }
  }

  /**
   * PATCH /api/notifications/read-all
   */
  static async markAllAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const count = await NotificationService.markAllAsRead(userId);
      res.status(200).json({ success: true, message: `Marked ${count} notifications as read` });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Failed to mark all as read' });
    }
  }
}

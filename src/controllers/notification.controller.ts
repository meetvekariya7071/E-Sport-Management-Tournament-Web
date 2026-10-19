import { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service';

export class NotificationController {
  static async getNotifications(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 30;

      const result = await NotificationService.getUserNotifications(userId, limit, page);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async markRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      await NotificationService.markAsRead(id, userId);
      res.status(200).json({ success: true, message: 'Notification marked as read.' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async markAllRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      await NotificationService.markAllAsRead(userId);
      res.status(200).json({ success: true, message: 'All notifications marked as read.' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

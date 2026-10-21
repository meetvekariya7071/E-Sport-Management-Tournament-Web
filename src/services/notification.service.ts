import { prisma } from '../config/db';
import { sendUserNotification } from './socket.service';

export interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type?: string;
  link?: string | null;
}

export class NotificationService {
  /**
   * Creates a notification, persists it, and dispatches it immediately via Socket.io.
   */
  static async create(params: CreateNotificationParams) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: params.userId,
          title: params.title,
          message: params.message,
          type: params.type || 'SYSTEM',
          link: params.link || null
        }
      });

      // Real-time dispatch
      sendUserNotification(params.userId, notification);

      return notification;
    } catch (err) {
      console.error('[NotificationService.create error]:', err);
      return null;
    }
  }

  /**
   * Broadcasts the same notification to multiple user IDs.
   */
  static async notifyMany(userIds: string[], params: Omit<CreateNotificationParams, 'userId'>) {
    if (!userIds || userIds.length === 0) return [];
    const results = await Promise.all(
      userIds.map((uid) =>
        this.create({
          userId: uid,
          ...params
        })
      )
    );
    return results.filter(Boolean);
  }

  /**
   * Retrieves paginated notifications for a user.
   */
  static async getUserNotifications(userId: string, query: { page?: number; limit?: number; unreadOnly?: boolean }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 15));
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (query.unreadOnly) {
      where.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } })
    ]);

    return {
      notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Marks a specific notification as read.
   */
  static async markAsRead(notificationId: string, userId: string) {
    const updated = await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId
      },
      data: { isRead: true }
    });
    return updated.count > 0;
  }

  /**
   * Marks all notifications as read for a user.
   */
  static async markAllAsRead(userId: string) {
    const updated = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false
      },
      data: { isRead: true }
    });
    return updated.count;
  }

  /**
   * Retrieves unread count for badge display.
   */
  static async getUnreadCount(userId: string) {
    return prisma.notification.count({
      where: {
        userId,
        isRead: false
      }
    });
  }
}

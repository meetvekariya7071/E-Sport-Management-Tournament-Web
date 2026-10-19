import { prisma } from '../config/db';
import { broadcastUserEvent } from '../config/socket';
import { NotificationType } from '../types';

export interface CreateNotificationDTO {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
}

export class NotificationService {
  /**
   * Dispatch a notification to a specific user and emit in real time
   */
  static async send(dto: CreateNotificationDTO) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: dto.userId,
          title: dto.title,
          message: dto.message,
          type: dto.type,
          link: dto.link || null
        }
      });

      // Broadcast real-time event to user room
      broadcastUserEvent(dto.userId, 'notification:new', notification);

      return notification;
    } catch (error) {
      console.error('[NotificationService.send Error]', error);
      return null;
    }
  }

  /**
   * Dispatch notification to multiple users simultaneously
   */
  static async sendBulk(userIds: string[], data: Omit<CreateNotificationDTO, 'userId'>) {
    if (!userIds.length) return [];
    const created = await Promise.all(
      userIds.map((uid) =>
        this.send({
          userId: uid,
          ...data
        })
      )
    );
    return created.filter(Boolean);
  }

  /**
   * Fetch user notifications with pagination
   */
  static async getUserNotifications(userId: string, limit = 30, page = 1) {
    const skip = (page - 1) * limit;

    const [items, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip
      }),
      prisma.notification.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, isRead: false } })
    ]);

    return {
      items,
      total,
      unreadCount,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Mark a single notification as read
   */
  static async markAsRead(id: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true }
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });
  }
}

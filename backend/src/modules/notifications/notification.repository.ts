import { Notification, NotificationType, Prisma } from '@prisma/client';
import { prisma } from '@config/prisma';

export class NotificationRepository {
  create(data: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    metadata?: Prisma.InputJsonValue;
  }): Promise<Notification> {
    return prisma.notification.create({ data });
  }

  async list(userId: string, params: { skip: number; take: number; unreadOnly?: boolean }) {
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(params.unreadOnly ? { isRead: false } : {}),
    };
    const [items, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);
    return { items, total, unreadCount };
  }

  markRead(id: string, userId: string): Promise<Prisma.BatchPayload> {
    return prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
  }

  markAllRead(userId: string): Promise<Prisma.BatchPayload> {
    return prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
  }
}

export const notificationRepository = new NotificationRepository();

import { Request, Response } from 'express';
import { asyncHandler } from '@common/utils/asyncHandler';
import { sendSuccess } from '@common/utils/response';
import { AppError } from '@common/errors/AppError';
import { parsePagination, buildMeta } from '@common/utils/pagination';
import { notificationRepository } from '@modules/notifications/notification.repository';

export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const pagination = parsePagination(req.query as Record<string, string>);
  const { items, total, unreadCount } = await notificationRepository.list(req.user.id, {
    skip: pagination.skip,
    take: pagination.take,
    unreadOnly: req.query.unreadOnly === 'true',
  });
  sendSuccess(res, items, 200, { ...buildMeta(pagination.page, pagination.limit, total), unreadCount });
});

export const markNotificationRead = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  await notificationRepository.markRead(req.params.id, req.user.id);
  sendSuccess(res, { updated: true });
});

export const markAllNotificationsRead = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  await notificationRepository.markAllRead(req.user.id);
  sendSuccess(res, { updated: true });
});

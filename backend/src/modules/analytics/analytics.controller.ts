import { Request, Response } from 'express';
import { GlobalRole } from '@prisma/client';
import { asyncHandler } from '@common/utils/asyncHandler';
import { sendSuccess } from '@common/utils/response';
import { AppError } from '@common/errors/AppError';
import { analyticsService } from '@modules/analytics/analytics.service';

function parseArgs(req: Request) {
  if (!req.user) throw AppError.unauthorized();
  const isAdmin = req.user.role === GlobalRole.ADMIN;
  const teamId = req.query.teamId as string | undefined;
  return { userId: req.user.id, isAdmin, teamId };
}

export const dashboard = asyncHandler(async (req: Request, res: Response) => {
  const { userId, isAdmin, teamId } = parseArgs(req);
  const data = await analyticsService.dashboard(userId, isAdmin, teamId);
  sendSuccess(res, data);
});

export const meetingsAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const { userId, isAdmin, teamId } = parseArgs(req);
  const days = req.query.days ? Number(req.query.days) : undefined;
  const data = await analyticsService.meetings(userId, isAdmin, teamId, days);
  sendSuccess(res, data);
});

export const tasksAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const { userId, isAdmin, teamId } = parseArgs(req);
  const data = await analyticsService.tasks(userId, isAdmin, teamId);
  sendSuccess(res, data);
});

export const aiUsageAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const { userId, isAdmin, teamId } = parseArgs(req);
  const data = await analyticsService.aiUsage(userId, isAdmin, teamId);
  sendSuccess(res, data);
});

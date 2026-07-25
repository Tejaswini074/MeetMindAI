import { Request, Response } from 'express';
import { asyncHandler } from '@common/utils/asyncHandler';
import { sendSuccess } from '@common/utils/response';
import { userService } from '@modules/users/user.service';
import { AppError } from '@common/errors/AppError';

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const user = await userService.getById(req.user.id);
  sendSuccess(res, user);
});

export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.getById(req.params.id);
  sendSuccess(res, user);
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const user = await userService.updateProfile(req.user.id, req.body);
  sendSuccess(res, user);
});

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const { items, meta } = await userService.list(req.query as Record<string, string>);
  sendSuccess(res, items, 200, meta);
});

export const registerDeviceToken = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  await userService.registerDeviceToken(req.user.id, req.body);
  sendSuccess(res, { registered: true });
});

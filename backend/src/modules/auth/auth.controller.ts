import { Request, Response } from 'express';
import { asyncHandler } from '@common/utils/asyncHandler';
import { sendSuccess } from '@common/utils/response';
import { authService } from '@modules/auth/auth.service';
import { AuditAction } from '@prisma/client';
import { recordAudit } from '@modules/audit/audit.service';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.register(req.body, req.ip);
  sendSuccess(res, result, 201);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body, req.ip);
  sendSuccess(res, result);
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const tokens = await authService.refresh(req.body.refreshToken);
  sendSuccess(res, tokens);
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  await authService.logout(req.body.refreshToken);
  if (req.user) {
    await recordAudit({
      actorId: req.user.id,
      action: AuditAction.LOGOUT,
      entityType: 'User',
      entityId: req.user.id,
      ipAddress: req.ip,
    });
  }
  sendSuccess(res, { loggedOut: true });
});

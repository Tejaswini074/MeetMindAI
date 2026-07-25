import { Request, Response } from 'express';
import { GlobalRole } from '@prisma/client';
import { asyncHandler } from '@common/utils/asyncHandler';
import { sendSuccess } from '@common/utils/response';
import { AppError } from '@common/errors/AppError';
import { teamService } from '@modules/teams/team.service';

export const createTeam = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const team = await teamService.create(req.user.id, req.body);
  sendSuccess(res, team, 201);
});

export const listTeams = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const { items, meta } = await teamService.list(
    req.user.id,
    req.user.role === GlobalRole.ADMIN,
    req.query as Record<string, string>,
  );
  sendSuccess(res, items, 200, meta);
});

export const getTeam = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  await teamService.assertCanView(req.params.id, req.user.id);
  const team = await teamService.getById(req.params.id);
  sendSuccess(res, team);
});

export const updateTeam = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const team = await teamService.update(req.params.id, req.user.id, req.body);
  sendSuccess(res, team);
});

export const deleteTeam = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  await teamService.remove(req.params.id, req.user.id);
  sendSuccess(res, { deleted: true });
});

export const listMembers = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  await teamService.assertCanView(req.params.id, req.user.id);
  const members = await teamService.listMembers(req.params.id);
  sendSuccess(res, members);
});

export const removeMember = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  await teamService.removeMember(req.params.id, req.user.id, req.params.userId);
  sendSuccess(res, { removed: true });
});

export const updateMemberRole = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const member = await teamService.updateMemberRole(
    req.params.id,
    req.user.id,
    req.params.userId,
    req.body.role,
  );
  sendSuccess(res, member);
});

export const inviteMember = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const invitation = await teamService.invite(req.params.id, req.user.id, req.body);
  sendSuccess(res, invitation, 201);
});

export const listInvitations = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const invitations = await teamService.listInvitations(req.params.id, req.user.id);
  sendSuccess(res, invitations);
});

export const acceptInvitation = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const team = await teamService.acceptInvitation(req.params.token, req.user.id, req.user.email);
  sendSuccess(res, team);
});

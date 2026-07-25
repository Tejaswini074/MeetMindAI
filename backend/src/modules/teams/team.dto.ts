import { z } from 'zod';
import { TeamMemberRole } from '@prisma/client';

export const createTeamSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(150),
    description: z.string().max(2000).optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const updateTeamSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(150).optional(),
    description: z.string().max(2000).optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const teamIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const listTeamsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

export const inviteMemberSchema = z.object({
  body: z.object({
    email: z.string().email(),
    role: z.nativeEnum(TeamMemberRole).default(TeamMemberRole.MEMBER),
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const acceptInvitationSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ token: z.string().min(10) }),
});

export const removeMemberSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid(), userId: z.string().uuid() }),
});

export const updateMemberRoleSchema = z.object({
  body: z.object({ role: z.nativeEnum(TeamMemberRole) }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid(), userId: z.string().uuid() }),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>['body'];
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>['body'];
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>['body'];

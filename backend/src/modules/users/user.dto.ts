import { z } from 'zod';
import { GlobalRole } from '@prisma/client';

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(120).optional(),
    avatarUrl: z.string().url().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const listUsersSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    role: z.nativeEnum(GlobalRole).optional(),
    search: z.string().optional(),
  }),
});

export const registerDeviceTokenSchema = z.object({
  body: z.object({
    fcmToken: z.string().min(10),
    platform: z.enum(['ios', 'android', 'web']),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>['body'];
export type RegisterDeviceTokenInput = z.infer<typeof registerDeviceTokenSchema>['body'];

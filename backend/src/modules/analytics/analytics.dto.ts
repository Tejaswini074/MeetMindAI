import { z } from 'zod';

export const analyticsQuerySchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    teamId: z.string().uuid().optional(),
    days: z.string().optional(),
  }),
});

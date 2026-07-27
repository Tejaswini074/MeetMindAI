import { z } from 'zod';

export const searchSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    q: z.string().min(2).max(300),
    type: z.enum(['fulltext', 'semantic', 'all']).default('all'),
    teamId: z.string().uuid().optional(),
  }),
});

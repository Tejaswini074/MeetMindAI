import { z } from 'zod';

export const oauthCallbackSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    code: z.string().min(1),
    state: z.string().min(1),
  }),
});

export const syncMeetingSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ meetingId: z.string().uuid() }),
});

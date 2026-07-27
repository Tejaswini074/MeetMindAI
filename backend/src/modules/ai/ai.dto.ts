import { z } from 'zod';

export const meetingAiActionSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const meetingQaSchema = z.object({
  body: z.object({ question: z.string().min(3).max(1000) }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const assistantQaSchema = z.object({
  body: z.object({ question: z.string().min(3).max(1000) }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

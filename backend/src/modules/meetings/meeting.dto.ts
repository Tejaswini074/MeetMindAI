import { z } from 'zod';
import { MeetingStatus, ParticipantRole, RsvpStatus } from '@prisma/client';

export const createMeetingSchema = z.object({
  body: z.object({
    teamId: z.string().uuid(),
    title: z.string().min(2).max(200),
    description: z.string().max(4000).optional(),
    scheduledAt: z.string().datetime(),
    durationMinutes: z.number().int().min(5).max(600).default(30),
    recurrenceRule: z.string().max(500).optional(),
    participantIds: z.array(z.string().uuid()).default([]),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const updateMeetingSchema = z.object({
  body: z.object({
    title: z.string().min(2).max(200).optional(),
    description: z.string().max(4000).optional(),
    scheduledAt: z.string().datetime().optional(),
    durationMinutes: z.number().int().min(5).max(600).optional(),
    status: z.nativeEnum(MeetingStatus).optional(),
    recurrenceRule: z.string().max(500).nullable().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const meetingIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const listMeetingsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    teamId: z.string().uuid().optional(),
    status: z.nativeEnum(MeetingStatus).optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  }),
});

export const addParticipantsSchema = z.object({
  body: z.object({
    participants: z.array(
      z.object({
        userId: z.string().uuid(),
        role: z.nativeEnum(ParticipantRole).default(ParticipantRole.ATTENDEE),
      }),
    ),
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const updateRsvpSchema = z.object({
  body: z.object({ status: z.nativeEnum(RsvpStatus) }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const markAttendanceSchema = z.object({
  body: z.object({ userId: z.string().uuid() }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export type CreateMeetingInput = z.infer<typeof createMeetingSchema>['body'];
export type UpdateMeetingInput = z.infer<typeof updateMeetingSchema>['body'];
export type AddParticipantsInput = z.infer<typeof addParticipantsSchema>['body'];

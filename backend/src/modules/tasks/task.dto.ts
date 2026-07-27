import { z } from 'zod';
import { TaskPriority, TaskStatus } from '@prisma/client';

export const createTaskSchema = z.object({
  body: z.object({
    teamId: z.string().uuid(),
    meetingId: z.string().uuid().optional(),
    title: z.string().min(2).max(200),
    description: z.string().max(4000).optional(),
    priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
    assigneeId: z.string().uuid().optional(),
    dueDate: z.string().datetime().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const updateTaskSchema = z.object({
  body: z.object({
    title: z.string().min(2).max(200).optional(),
    description: z.string().max(4000).optional(),
    priority: z.nativeEnum(TaskPriority).optional(),
    assigneeId: z.string().uuid().nullable().optional(),
    dueDate: z.string().datetime().nullable().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const moveTaskSchema = z.object({
  body: z.object({
    status: z.nativeEnum(TaskStatus),
    position: z.number().int().min(0).default(0),
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const taskIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const listTasksSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    teamId: z.string().uuid(),
    status: z.nativeEnum(TaskStatus).optional(),
    assigneeId: z.string().uuid().optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

export const boardQuerySchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({ teamId: z.string().uuid() }),
});

export const addCommentSchema = z.object({
  body: z.object({ content: z.string().min(1).max(4000) }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>['body'];
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>['body'];
export type MoveTaskInput = z.infer<typeof moveTaskSchema>['body'];

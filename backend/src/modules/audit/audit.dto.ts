import { z } from 'zod';
import { AuditAction } from '@prisma/client';

export const listAuditLogsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    action: z.nativeEnum(AuditAction).optional(),
    entityType: z.string().optional(),
    actorId: z.string().uuid().optional(),
  }),
});

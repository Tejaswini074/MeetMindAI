import { AuditAction, Prisma } from '@prisma/client';
import { prisma } from '@config/prisma';
import { logger } from '@common/utils/logger';

export interface RecordAuditInput {
  actorId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  diff?: Prisma.InputJsonValue;
  ipAddress?: string | null;
}

export async function recordAudit(input: RecordAuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? undefined,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? undefined,
        diff: input.diff,
        ipAddress: input.ipAddress ?? undefined,
      },
    });
  } catch (err) {
    // Audit logging must never break the primary request flow.
    logger.error('Failed to record audit log', { err, input });
  }
}

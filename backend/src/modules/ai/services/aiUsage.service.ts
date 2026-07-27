import { AiFeature } from '@prisma/client';
import { prisma } from '@config/prisma';
import { logger } from '@common/utils/logger';

export interface LogAiUsageInput {
  userId?: string | null;
  feature: AiFeature;
  model: string;
  tokensUsed?: number | null;
  meetingId?: string | null;
}

export async function logAiUsage(input: LogAiUsageInput): Promise<void> {
  try {
    await prisma.aiUsageLog.create({
      data: {
        userId: input.userId ?? undefined,
        feature: input.feature,
        model: input.model,
        tokensUsed: input.tokensUsed ?? undefined,
        meetingId: input.meetingId ?? undefined,
      },
    });
  } catch (err) {
    logger.error('Failed to record AI usage log', { err, input });
  }
}

import { AuditAction, SentimentLabel, TaskPriority, TaskStatus, ActionItemSource } from '@prisma/client';
import { prisma } from '@config/prisma';
import { AppError } from '@common/errors/AppError';
import { logger } from '@common/utils/logger';
import { recordAudit } from '@modules/audit/audit.service';
import { meetingService } from '@modules/meetings/meeting.service';
import { teamRepository } from '@modules/teams/team.repository';
import { summarizeTranscript, extractActionItems, detectSentiment, answerQuestionFromContext } from '@modules/ai/services/gpt.service';
import { embedText, cosineSimilarity } from '@modules/ai/services/embedding.service';
import { notifyTaskAssigned } from '@modules/notifications/notification.service';

const PRIORITY_MAP: Record<string, TaskPriority> = {
  LOW: TaskPriority.LOW,
  MEDIUM: TaskPriority.MEDIUM,
  HIGH: TaskPriority.HIGH,
  URGENT: TaskPriority.URGENT,
};

async function getCombinedTranscriptText(meetingId: string): Promise<string> {
  const transcripts = await prisma.transcript.findMany({
    where: { meetingId },
    orderBy: { createdAt: 'asc' },
  });
  if (transcripts.length === 0) {
    throw AppError.badRequest('This meeting has no transcript yet. Upload audio or a transcript file first.');
  }
  return transcripts.map((t) => t.fullText).join('\n\n');
}

export class AiService {
  async generateSummary(meetingId: string, actorId: string) {
    await this.assertAccess(meetingId, actorId);
    const text = await getCombinedTranscriptText(meetingId);
    const content = await summarizeTranscript(text, actorId);

    const summary = await prisma.summary.create({
      data: { meetingId, content, model: 'gpt' },
    });

    await recordAudit({ actorId, action: AuditAction.CREATE, entityType: 'Summary', entityId: summary.id });
    return summary;
  }

  async generateActionItems(meetingId: string, actorId: string) {
    await this.assertAccess(meetingId, actorId);
    const meeting = await prisma.meeting.findUniqueOrThrow({ where: { id: meetingId } });
    const text = await getCombinedTranscriptText(meetingId);

    const members = await teamRepository.listMembers(meeting.teamId);
    const candidates = members.map((m) => ({ id: m.userId, name: m.user.name }));

    const parsedItems = await extractActionItems(text, candidates, actorId);

    const created = [];
    for (const item of parsedItems) {
      const task = await prisma.task.create({
        data: {
          teamId: meeting.teamId,
          meetingId,
          title: item.title,
          status: TaskStatus.TODO,
          priority: PRIORITY_MAP[item.priority] ?? TaskPriority.MEDIUM,
          assigneeId: item.assigneeId ?? undefined,
          dueDate: item.dueDate ?? undefined,
          createdById: actorId,
        },
      });

      const actionItem = await prisma.actionItem.create({
        data: {
          meetingId,
          taskId: task.id,
          title: item.title,
          assigneeId: item.assigneeId ?? undefined,
          priority: item.priority,
          dueDate: item.dueDate ?? undefined,
          sourceType: ActionItemSource.AI,
          confidence: item.confidence,
        },
      });

      if (item.assigneeId) {
        await notifyTaskAssigned(task.id, item.assigneeId).catch((err) =>
          logger.error('Failed to notify task assignee', { err, taskId: task.id }),
        );
      }

      created.push(actionItem);
    }

    await recordAudit({
      actorId,
      action: AuditAction.CREATE,
      entityType: 'ActionItem',
      entityId: meetingId,
      diff: { count: created.length },
    });

    return created;
  }

  async analyzeSentiment(meetingId: string, actorId: string) {
    await this.assertAccess(meetingId, actorId);
    const text = await getCombinedTranscriptText(meetingId);
    const { label, score } = await detectSentiment(text, actorId);

    const meeting = await prisma.meeting.update({
      where: { id: meetingId },
      data: { sentimentLabel: label as SentimentLabel, sentimentScore: score },
    });

    return { sentimentLabel: meeting.sentimentLabel, sentimentScore: meeting.sentimentScore };
  }

  /** RAG-style Q&A across a user's accessible meetings (or a single meeting if meetingId is given). */
  async askQuestion(actorId: string, question: string, meetingId?: string) {
    let teamIds: string[];
    if (meetingId) {
      const meeting = await meetingService.getById(meetingId, actorId);
      teamIds = [meeting.teamId];
    } else {
      const teams = await teamRepository.listForUser({ userId: actorId, isAdmin: false, skip: 0, take: 1000 });
      teamIds = teams.items.map((t) => t.id);
    }

    const candidateSegments = await prisma.transcriptSegment.findMany({
      where: {
        transcript: { meeting: { teamId: { in: teamIds }, ...(meetingId ? { id: meetingId } : {}) } },
      },
      include: { transcript: { include: { meeting: true } } },
      take: 1000,
    });
    const segments = candidateSegments.filter((s) => s.embedding !== null);

    if (segments.length === 0) {
      return {
        answer: "I don't have any transcribed meetings to search yet. Transcribe or upload a transcript first.",
        sources: [],
      };
    }

    const questionEmbedding = await embedText(question, actorId);

    const scored = segments
      .map((s) => ({
        segment: s,
        score: cosineSimilarity(questionEmbedding, s.embedding as unknown as number[]),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    const contextChunks = scored.map(
      (s) => `[Meeting: ${s.segment.transcript.meeting.title}] ${s.segment.text}`,
    );

    const answer = await answerQuestionFromContext(question, contextChunks, actorId);

    return {
      answer,
      sources: scored.map((s) => ({
        meetingId: s.segment.transcript.meeting.id,
        meetingTitle: s.segment.transcript.meeting.title,
        excerpt: s.segment.text.slice(0, 200),
        relevance: Math.round(s.score * 1000) / 1000,
      })),
    };
  }

  /** Runs automatically once a Whisper transcription completes: summary, action items, sentiment. */
  private async assertAccess(meetingId: string, actorId: string): Promise<void> {
    await meetingService.getById(meetingId, actorId);
  }
}

export const aiService = new AiService();

export async function runPostTranscriptionPipeline(meetingId: string): Promise<void> {
  const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting) return;

  await aiService.generateSummary(meetingId, meeting.createdById).catch((err) =>
    logger.error('Auto-summary failed', { err, meetingId }),
  );
  await aiService.generateActionItems(meetingId, meeting.createdById).catch((err) =>
    logger.error('Auto action-item extraction failed', { err, meetingId }),
  );
  await aiService.analyzeSentiment(meetingId, meeting.createdById).catch((err) =>
    logger.error('Auto sentiment analysis failed', { err, meetingId }),
  );
}

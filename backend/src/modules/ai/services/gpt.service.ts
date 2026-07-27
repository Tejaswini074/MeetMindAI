import { z } from 'zod';
import { AiFeature, ActionItemPriority, SentimentLabel } from '@prisma/client';
import { env } from '@config/env';
import { getOpenAIClient } from '@modules/ai/services/openai.client';
import { logAiUsage } from '@modules/ai/services/aiUsage.service';

export interface TeamMemberCandidate {
  id: string;
  name: string;
}

const actionItemsResponseSchema = z.object({
  actionItems: z.array(
    z.object({
      title: z.string().min(1),
      assigneeName: z.string().nullable().optional(),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
      dueDate: z.string().nullable().optional(),
      confidence: z.number().min(0).max(1).default(0.7),
    }),
  ),
});

export interface ParsedActionItem {
  title: string;
  assigneeId: string | null;
  priority: ActionItemPriority;
  dueDate: Date | null;
  confidence: number;
}

/**
 * Parses (and validates) the raw JSON string returned by the action-item extraction
 * prompt, resolving assignee names against the known team roster. Kept separate from
 * the network call so it can be unit tested without mocking OpenAI.
 */
export function parseActionItemsResponse(raw: string, teamMembers: TeamMemberCandidate[]): ParsedActionItem[] {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return [];
  }

  const parsed = actionItemsResponseSchema.safeParse(json);
  if (!parsed.success) return [];

  return parsed.data.actionItems.map((item) => {
    const match = item.assigneeName
      ? teamMembers.find((m) => m.name.toLowerCase() === item.assigneeName!.toLowerCase())
      : undefined;

    const parsedDate = item.dueDate ? new Date(item.dueDate) : null;

    return {
      title: item.title,
      assigneeId: match?.id ?? null,
      priority: ActionItemPriority[item.priority],
      dueDate: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null,
      confidence: item.confidence,
    };
  });
}

export async function summarizeTranscript(transcriptText: string, userId?: string): Promise<string> {
  const client = getOpenAIClient();
  const completion = await client.chat.completions.create({
    model: env.OPENAI_CHAT_MODEL,
    messages: [
      {
        role: 'system',
        content:
          'You are an assistant that writes concise, well-structured meeting summaries. ' +
          'Include: key discussion points, decisions made, and open questions. Use markdown headings and bullet points.',
      },
      { role: 'user', content: `Meeting transcript:\n\n${transcriptText.slice(0, 24000)}` },
    ],
    temperature: 0.3,
  });

  await logAiUsage({
    userId,
    feature: AiFeature.SUMMARY,
    model: env.OPENAI_CHAT_MODEL,
    tokensUsed: completion.usage?.total_tokens,
  });

  return completion.choices[0]?.message?.content?.trim() ?? '';
}

export async function extractActionItems(
  transcriptText: string,
  teamMembers: TeamMemberCandidate[],
  userId?: string,
): Promise<ParsedActionItem[]> {
  const client = getOpenAIClient();
  const roster = teamMembers.map((m) => m.name).join(', ') || 'Unknown';

  const completion = await client.chat.completions.create({
    model: env.OPENAI_CHAT_MODEL,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You extract action items from meeting transcripts. Respond with strict JSON matching this shape: ' +
          '{"actionItems":[{"title":string,"assigneeName":string|null,"priority":"LOW"|"MEDIUM"|"HIGH"|"URGENT","dueDate":string|null,"confidence":number}]}. ' +
          `Only assign "assigneeName" if the transcript clearly attributes the task to one of these known team members: ${roster}. ` +
          'dueDate must be an ISO 8601 date if mentioned, otherwise null. If there are no action items, return an empty array.',
      },
      { role: 'user', content: `Meeting transcript:\n\n${transcriptText.slice(0, 24000)}` },
    ],
    temperature: 0.2,
  });

  await logAiUsage({
    userId,
    feature: AiFeature.ACTION_ITEMS,
    model: env.OPENAI_CHAT_MODEL,
    tokensUsed: completion.usage?.total_tokens,
  });

  const raw = completion.choices[0]?.message?.content ?? '{"actionItems":[]}';
  return parseActionItemsResponse(raw, teamMembers);
}

const sentimentResponseSchema = z.object({
  label: z.enum(['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'MIXED']),
  score: z.number().min(-1).max(1),
});

export async function detectSentiment(
  transcriptText: string,
  userId?: string,
): Promise<{ label: SentimentLabel; score: number }> {
  const client = getOpenAIClient();
  const completion = await client.chat.completions.create({
    model: env.OPENAI_CHAT_MODEL,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'Analyze the overall sentiment/tone of this meeting transcript. Respond with strict JSON: ' +
          '{"label":"POSITIVE"|"NEUTRAL"|"NEGATIVE"|"MIXED","score":number} where score ranges from -1 (very negative) to 1 (very positive).',
      },
      { role: 'user', content: transcriptText.slice(0, 24000) },
    ],
    temperature: 0.2,
  });

  await logAiUsage({
    userId,
    feature: AiFeature.SENTIMENT,
    model: env.OPENAI_CHAT_MODEL,
    tokensUsed: completion.usage?.total_tokens,
  });

  const raw = completion.choices[0]?.message?.content ?? '{"label":"NEUTRAL","score":0}';
  try {
    const parsed = sentimentResponseSchema.parse(JSON.parse(raw));
    return { label: SentimentLabel[parsed.label], score: parsed.score };
  } catch {
    return { label: SentimentLabel.NEUTRAL, score: 0 };
  }
}

export async function answerQuestionFromContext(
  question: string,
  contextChunks: string[],
  userId?: string,
): Promise<string> {
  const client = getOpenAIClient();
  const context = contextChunks.join('\n---\n').slice(0, 20000);

  const completion = await client.chat.completions.create({
    model: env.OPENAI_CHAT_MODEL,
    messages: [
      {
        role: 'system',
        content:
          'You answer questions about past meetings using ONLY the provided context excerpts. ' +
          "If the answer isn't in the context, say you don't have enough information — do not guess.",
      },
      { role: 'user', content: `Context excerpts:\n${context}\n\nQuestion: ${question}` },
    ],
    temperature: 0.2,
  });

  await logAiUsage({
    userId,
    feature: AiFeature.QA,
    model: env.OPENAI_CHAT_MODEL,
    tokensUsed: completion.usage?.total_tokens,
  });

  return completion.choices[0]?.message?.content?.trim() ?? "I don't have enough information to answer that.";
}

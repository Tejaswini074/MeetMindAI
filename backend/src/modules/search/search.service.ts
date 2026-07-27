import { Prisma } from '@prisma/client';
import { prisma } from '@config/prisma';
import { teamRepository } from '@modules/teams/team.repository';
import { embedText, cosineSimilarity } from '@modules/ai/services/embedding.service';

export interface SearchResult {
  type: 'meeting' | 'transcript' | 'summary' | 'task';
  id: string;
  meetingId: string | null;
  teamId: string;
  title: string;
  snippet: string;
  score: number;
}

async function getAccessibleTeamIds(actorId: string, isAdmin: boolean, teamId?: string): Promise<string[]> {
  if (teamId) return [teamId];
  const teams = await teamRepository.listForUser({ userId: actorId, isAdmin, skip: 0, take: 1000 });
  return teams.items.map((t) => t.id);
}

export async function fulltextSearch(
  actorId: string,
  isAdmin: boolean,
  query: string,
  teamId?: string,
): Promise<SearchResult[]> {
  const teamIds = await getAccessibleTeamIds(actorId, isAdmin, teamId);
  if (teamIds.length === 0) return [];

  const teamIdList = Prisma.join(teamIds);

  const [meetings, transcripts, summaries, tasks] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string; teamId: string; title: string; description: string | null; score: number }>>(
      Prisma.sql`SELECT id, teamId, title, description, MATCH(title, description) AGAINST (${query} IN NATURAL LANGUAGE MODE) AS score
                 FROM Meeting
                 WHERE teamId IN (${teamIdList}) AND MATCH(title, description) AGAINST (${query} IN NATURAL LANGUAGE MODE)
                 ORDER BY score DESC LIMIT 10`,
    ),
    prisma.$queryRaw<Array<{ id: string; meetingId: string; teamId: string; fullText: string; score: number }>>(
      Prisma.sql`SELECT t.id, t.meetingId, m.teamId, t.fullText, MATCH(t.fullText) AGAINST (${query} IN NATURAL LANGUAGE MODE) AS score
                 FROM Transcript t JOIN Meeting m ON m.id = t.meetingId
                 WHERE m.teamId IN (${teamIdList}) AND MATCH(t.fullText) AGAINST (${query} IN NATURAL LANGUAGE MODE)
                 ORDER BY score DESC LIMIT 10`,
    ),
    prisma.$queryRaw<Array<{ id: string; meetingId: string; teamId: string; content: string; score: number }>>(
      Prisma.sql`SELECT s.id, s.meetingId, m.teamId, s.content, MATCH(s.content) AGAINST (${query} IN NATURAL LANGUAGE MODE) AS score
                 FROM Summary s JOIN Meeting m ON m.id = s.meetingId
                 WHERE m.teamId IN (${teamIdList}) AND MATCH(s.content) AGAINST (${query} IN NATURAL LANGUAGE MODE)
                 ORDER BY score DESC LIMIT 10`,
    ),
    prisma.$queryRaw<Array<{ id: string; teamId: string; title: string; description: string | null; score: number }>>(
      Prisma.sql`SELECT id, teamId, title, description, MATCH(title, description) AGAINST (${query} IN NATURAL LANGUAGE MODE) AS score
                 FROM Task
                 WHERE teamId IN (${teamIdList}) AND MATCH(title, description) AGAINST (${query} IN NATURAL LANGUAGE MODE)
                 ORDER BY score DESC LIMIT 10`,
    ),
  ]);

  const results: SearchResult[] = [
    ...meetings.map((m) => ({
      type: 'meeting' as const,
      id: m.id,
      meetingId: m.id,
      teamId: m.teamId,
      title: m.title,
      snippet: (m.description ?? '').slice(0, 240),
      score: Number(m.score),
    })),
    ...transcripts.map((t) => ({
      type: 'transcript' as const,
      id: t.id,
      meetingId: t.meetingId,
      teamId: t.teamId,
      title: 'Transcript excerpt',
      snippet: t.fullText.slice(0, 240),
      score: Number(t.score),
    })),
    ...summaries.map((s) => ({
      type: 'summary' as const,
      id: s.id,
      meetingId: s.meetingId,
      teamId: s.teamId,
      title: 'Meeting summary',
      snippet: s.content.slice(0, 240),
      score: Number(s.score),
    })),
    ...tasks.map((t) => ({
      type: 'task' as const,
      id: t.id,
      meetingId: null,
      teamId: t.teamId,
      title: t.title,
      snippet: (t.description ?? '').slice(0, 240),
      score: Number(t.score),
    })),
  ];

  return results.sort((a, b) => b.score - a.score);
}

export async function semanticSearch(
  actorId: string,
  isAdmin: boolean,
  query: string,
  teamId?: string,
): Promise<SearchResult[]> {
  const teamIds = await getAccessibleTeamIds(actorId, isAdmin, teamId);
  if (teamIds.length === 0) return [];

  const segments = await prisma.transcriptSegment.findMany({
    where: { transcript: { meeting: { teamId: { in: teamIds } } } },
    include: { transcript: { include: { meeting: true } } },
    take: 1000,
  });
  const embedded = segments.filter((s) => s.embedding !== null);
  if (embedded.length === 0) return [];

  const queryEmbedding = await embedText(query, actorId);

  return embedded
    .map((s) => ({
      type: 'transcript' as const,
      id: s.id,
      meetingId: s.transcript.meetingId,
      teamId: s.transcript.meeting.teamId,
      title: `Transcript: ${s.transcript.meeting.title}`,
      snippet: s.text.slice(0, 240),
      score: cosineSimilarity(queryEmbedding, s.embedding as unknown as number[]),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 15);
}

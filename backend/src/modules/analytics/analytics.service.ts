import { MeetingStatus, TaskStatus } from '@prisma/client';
import { prisma } from '@config/prisma';
import { teamRepository } from '@modules/teams/team.repository';

async function resolveTeamIds(actorId: string, isAdmin: boolean, teamId?: string): Promise<string[]> {
  if (teamId) return [teamId];
  const teams = await teamRepository.listForUser({ userId: actorId, isAdmin, skip: 0, take: 1000 });
  return teams.items.map((t) => t.id);
}

/** AiUsageLog only stores a raw meetingId (no FK relation), so scope it by first resolving meeting ids. */
async function resolveMeetingIds(teamIds: string[]): Promise<string[]> {
  const meetings = await prisma.meeting.findMany({ where: { teamId: { in: teamIds } }, select: { id: true } });
  return meetings.map((m) => m.id);
}

export class AnalyticsService {
  async dashboard(actorId: string, isAdmin: boolean, teamId?: string) {
    const teamIds = await resolveTeamIds(actorId, isAdmin, teamId);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalMeetings,
      meetingsThisMonth,
      upcomingMeetings,
      totalTasks,
      tasksByStatus,
      totalActionItems,
      aiUsageByFeature,
    ] = await Promise.all([
      prisma.meeting.count({ where: { teamId: { in: teamIds } } }),
      prisma.meeting.count({ where: { teamId: { in: teamIds }, createdAt: { gte: startOfMonth } } }),
      prisma.meeting.count({
        where: { teamId: { in: teamIds }, status: MeetingStatus.SCHEDULED, scheduledAt: { gte: now } },
      }),
      prisma.task.count({ where: { teamId: { in: teamIds } } }),
      prisma.task.groupBy({ by: ['status'], where: { teamId: { in: teamIds } }, _count: true }),
      prisma.actionItem.count({ where: { meeting: { teamId: { in: teamIds } } } }),
      resolveMeetingIds(teamIds).then((meetingIds) =>
        prisma.aiUsageLog.groupBy({ by: ['feature'], where: { meetingId: { in: meetingIds } }, _count: true }),
      ),
    ]);

    const doneCount = tasksByStatus.find((t) => t.status === TaskStatus.DONE)?._count ?? 0;
    const taskCompletionRate = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 1000) / 10 : 0;

    return {
      totalMeetings,
      meetingsThisMonth,
      upcomingMeetings,
      totalTasks,
      taskCompletionRate,
      tasksByStatus: tasksByStatus.map((t) => ({ status: t.status, count: t._count })),
      totalActionItems,
      aiUsageByFeature: aiUsageByFeature.map((a) => ({ feature: a.feature, count: a._count })),
    };
  }

  async meetings(actorId: string, isAdmin: boolean, teamId?: string, days = 90) {
    const teamIds = await resolveTeamIds(actorId, isAdmin, teamId);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const meetings = await prisma.meeting.findMany({
      where: { teamId: { in: teamIds }, scheduledAt: { gte: since } },
      select: { scheduledAt: true, durationMinutes: true, status: true, sentimentScore: true },
    });

    const byWeek = new Map<string, number>();
    let totalDuration = 0;
    let sentimentSum = 0;
    let sentimentCount = 0;

    for (const m of meetings) {
      const weekStart = new Date(m.scheduledAt);
      weekStart.setHours(0, 0, 0, 0);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const key = weekStart.toISOString().slice(0, 10);
      byWeek.set(key, (byWeek.get(key) ?? 0) + 1);

      totalDuration += m.durationMinutes;
      if (m.sentimentScore !== null) {
        sentimentSum += m.sentimentScore;
        sentimentCount += 1;
      }
    }

    return {
      totalInRange: meetings.length,
      averageDurationMinutes: meetings.length ? Math.round(totalDuration / meetings.length) : 0,
      averageSentiment: sentimentCount ? Math.round((sentimentSum / sentimentCount) * 100) / 100 : null,
      countByWeek: [...byWeek.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([week, count]) => ({ week, count })),
      byStatus: await this.countByStatus(teamIds, since),
    };
  }

  private async countByStatus(teamIds: string[], since: Date) {
    const grouped = await prisma.meeting.groupBy({
      by: ['status'],
      where: { teamId: { in: teamIds }, scheduledAt: { gte: since } },
      _count: true,
    });
    return grouped.map((g) => ({ status: g.status, count: g._count }));
  }

  async tasks(actorId: string, isAdmin: boolean, teamId?: string) {
    const teamIds = await resolveTeamIds(actorId, isAdmin, teamId);
    const now = new Date();

    const [byStatus, byPriority, overdue, byAssignee] = await Promise.all([
      prisma.task.groupBy({ by: ['status'], where: { teamId: { in: teamIds } }, _count: true }),
      prisma.task.groupBy({ by: ['priority'], where: { teamId: { in: teamIds } }, _count: true }),
      prisma.task.count({
        where: { teamId: { in: teamIds }, dueDate: { lt: now }, status: { not: TaskStatus.DONE } },
      }),
      prisma.task.groupBy({
        by: ['assigneeId'],
        where: { teamId: { in: teamIds }, assigneeId: { not: null } },
        _count: true,
      }),
    ]);

    const assigneeIds = byAssignee.map((a) => a.assigneeId).filter((id): id is string => !!id);
    const assignees = await prisma.user.findMany({ where: { id: { in: assigneeIds } }, select: { id: true, name: true } });
    const assigneeMap = new Map(assignees.map((a) => [a.id, a.name]));

    return {
      byStatus: byStatus.map((g) => ({ status: g.status, count: g._count })),
      byPriority: byPriority.map((g) => ({ priority: g.priority, count: g._count })),
      overdueCount: overdue,
      byAssignee: byAssignee.map((g) => ({
        assigneeId: g.assigneeId,
        assigneeName: g.assigneeId ? assigneeMap.get(g.assigneeId) ?? 'Unknown' : 'Unassigned',
        count: g._count,
      })),
    };
  }

  async aiUsage(actorId: string, isAdmin: boolean, teamId?: string) {
    const teamIds = await resolveTeamIds(actorId, isAdmin, teamId);
    const meetingIds = await resolveMeetingIds(teamIds);

    const [byFeature, totalTokens] = await Promise.all([
      prisma.aiUsageLog.groupBy({
        by: ['feature'],
        where: { meetingId: { in: meetingIds } },
        _count: true,
        _sum: { tokensUsed: true },
      }),
      prisma.aiUsageLog.aggregate({
        where: { meetingId: { in: meetingIds } },
        _sum: { tokensUsed: true },
      }),
    ]);

    return {
      totalTokensUsed: totalTokens._sum.tokensUsed ?? 0,
      byFeature: byFeature.map((f) => ({
        feature: f.feature,
        count: f._count,
        tokensUsed: f._sum.tokensUsed ?? 0,
      })),
    };
  }
}

export const analyticsService = new AnalyticsService();

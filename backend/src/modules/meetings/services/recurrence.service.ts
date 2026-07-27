import { RRule } from 'rrule';
import { ParticipantRole } from '@prisma/client';
import { prisma } from '@config/prisma';
import { logger } from '@common/utils/logger';
import { meetingRepository } from '@modules/meetings/meeting.repository';
import { notifyMeetingInvite } from '@modules/notifications/notification.service';

const LOOKAHEAD_MS = 2 * 24 * 60 * 60 * 1000; // generate occurrences up to 2 days ahead

export async function generateUpcomingRecurringOccurrences(): Promise<number> {
  const series = await meetingRepository.findRecurringSeries();
  const now = new Date();
  let generated = 0;

  for (const parent of series) {
    if (!parent.recurrenceRule) continue;

    const referenceDate = parent.occurrences[0]?.scheduledAt ?? parent.scheduledAt;

    let rule: RRule;
    try {
      rule = new RRule({ ...RRule.parseString(parent.recurrenceRule), dtstart: referenceDate });
    } catch (err) {
      logger.warn(`Invalid recurrence rule on meeting ${parent.id}: ${parent.recurrenceRule}`, { err });
      continue;
    }

    const nextDate = rule.after(referenceDate, false);
    if (!nextDate || nextDate.getTime() > now.getTime() + LOOKAHEAD_MS) continue;

    const alreadyExists = await prisma.meeting.findFirst({
      where: { parentMeetingId: parent.id, scheduledAt: nextDate },
    });
    if (alreadyExists) continue;

    const occurrence = await prisma.meeting.create({
      data: {
        teamId: parent.teamId,
        title: parent.title,
        description: parent.description,
        scheduledAt: nextDate,
        durationMinutes: parent.durationMinutes,
        createdById: parent.createdById,
        parentMeetingId: parent.id,
      },
    });

    const parentParticipants = await prisma.meetingParticipant.findMany({ where: { meetingId: parent.id } });
    for (const p of parentParticipants) {
      await meetingRepository.addParticipant(occurrence.id, p.userId, p.role as ParticipantRole);
    }

    await notifyMeetingInvite(
      occurrence.id,
      parentParticipants.map((p) => p.userId),
    );

    generated += 1;
  }

  return generated;
}

import { MeetingStatus, NotificationType } from '@prisma/client';
import { prisma } from '@config/prisma';
import { createNotification } from '@modules/notifications/notification.service';

const REMINDER_WINDOW_MINUTES = 15;

/**
 * Finds meetings starting within the next REMINDER_WINDOW_MINUTES that haven't had a
 * reminder sent yet (tracked via a metadata flag on the Meeting itself would require a
 * schema change, so instead we dedupe by checking for an existing MEETING_REMINDER
 * notification referencing this meeting) and notifies all participants.
 */
export async function sendUpcomingMeetingReminders(): Promise<number> {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MINUTES * 60 * 1000);

  const upcomingMeetings = await prisma.meeting.findMany({
    where: {
      status: MeetingStatus.SCHEDULED,
      scheduledAt: { gte: now, lte: windowEnd },
    },
    include: { participants: true },
  });

  let notified = 0;

  for (const meeting of upcomingMeetings) {
    for (const participant of meeting.participants) {
      const recentReminders = await prisma.notification.findMany({
        where: { userId: participant.userId, type: NotificationType.MEETING_REMINDER },
        select: { metadata: true },
      });
      const alreadyNotified = recentReminders.some(
        (n) => (n.metadata as { meetingId?: string } | null)?.meetingId === meeting.id,
      );
      if (alreadyNotified) continue;

      await createNotification({
        userId: participant.userId,
        type: NotificationType.MEETING_REMINDER,
        title: 'Upcoming meeting',
        body: `"${meeting.title}" starts at ${meeting.scheduledAt.toLocaleTimeString()}`,
        metadata: { meetingId: meeting.id },
      });
      notified += 1;
    }
  }

  return notified;
}

import { NotificationType, Prisma } from '@prisma/client';
import { prisma } from '@config/prisma';
import { notificationRepository } from '@modules/notifications/notification.repository';
import { emitToUser } from '@sockets/emitters';
import { sendPushToUser } from '@modules/notifications/services/push.service';
import { sendEmail } from '@modules/notifications/services/email.service';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  metadata?: Prisma.InputJsonValue;
  pushEnabled?: boolean;
}

export async function createNotification(input: CreateNotificationInput): Promise<void> {
  const notification = await notificationRepository.create({
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    metadata: input.metadata,
  });

  emitToUser(input.userId, 'notification:new', notification);

  if (input.pushEnabled !== false) {
    await sendPushToUser(input.userId, input.title, input.body, { type: input.type });
  }
}

export async function notifyMeetingInvite(meetingId: string, userIds: string[]): Promise<void> {
  if (userIds.length === 0) return;

  const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting) return;

  const users = await prisma.user.findMany({ where: { id: { in: userIds } } });

  await Promise.all(
    users.map((user) =>
      Promise.all([
        createNotification({
          userId: user.id,
          type: NotificationType.MEETING_INVITE,
          title: 'New meeting invite',
          body: `You've been invited to "${meeting.title}" on ${meeting.scheduledAt.toLocaleString()}`,
          metadata: { meetingId },
        }),
        sendEmail({
          to: user.email,
          subject: `Meeting invite: ${meeting.title}`,
          html: `<p>You've been invited to <strong>${meeting.title}</strong>, scheduled for ${meeting.scheduledAt.toLocaleString()}.</p>`,
        }),
      ]),
    ),
  );
}

export async function notifyTaskAssigned(taskId: string, assigneeId: string): Promise<void> {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return;

  await createNotification({
    userId: assigneeId,
    type: NotificationType.TASK_ASSIGNED,
    title: 'New task assigned',
    body: `You've been assigned: "${task.title}"`,
    metadata: { taskId },
  });
}

export async function notifyTaskComment(taskId: string, commenterId: string, notifyUserIds: string[]): Promise<void> {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return;

  const recipients = notifyUserIds.filter((id) => id !== commenterId);
  await Promise.all(
    recipients.map((userId) =>
      createNotification({
        userId,
        type: NotificationType.TASK_COMMENT,
        title: 'New comment on your task',
        body: `New comment on "${task.title}"`,
        metadata: { taskId },
      }),
    ),
  );
}

export async function notifyActionItemAssigned(actionItemId: string, assigneeId: string): Promise<void> {
  const actionItem = await prisma.actionItem.findUnique({ where: { id: actionItemId } });
  if (!actionItem) return;

  await createNotification({
    userId: assigneeId,
    type: NotificationType.ACTION_ITEM_ASSIGNED,
    title: 'New action item assigned',
    body: `You've been assigned an action item: "${actionItem.title}"`,
    metadata: { actionItemId },
  });
}

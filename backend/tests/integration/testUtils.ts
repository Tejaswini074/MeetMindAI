import { prisma } from '@config/prisma';

/** Deletes all rows in dependency order so each integration test file starts from a clean slate. */
export async function cleanDatabase(): Promise<void> {
  await prisma.auditLog.deleteMany();
  await prisma.aiUsageLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.taskAttachment.deleteMany();
  await prisma.taskComment.deleteMany();
  await prisma.actionItem.deleteMany();
  await prisma.task.deleteMany();
  await prisma.summary.deleteMany();
  await prisma.transcriptSegment.deleteMany();
  await prisma.transcript.deleteMany();
  await prisma.meetingAudio.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.meetingParticipant.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.teamInvitation.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.calendarIntegration.deleteMany();
  await prisma.deviceToken.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
}

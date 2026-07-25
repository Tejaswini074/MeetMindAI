import { Meeting, MeetingStatus, ParticipantRole, Prisma, RsvpStatus } from '@prisma/client';
import { prisma } from '@config/prisma';

const fullInclude = {
  createdBy: true,
  participants: { include: { user: true } },
  audios: true,
  transcripts: { include: { segments: true } },
  summaries: true,
  actionItems: { include: { assignee: true } },
} satisfies Prisma.MeetingInclude;

export class MeetingRepository {
  create(data: Prisma.MeetingCreateInput): Promise<Meeting> {
    return prisma.meeting.create({ data });
  }

  findById(id: string) {
    return prisma.meeting.findUnique({ where: { id }, include: fullInclude });
  }

  update(id: string, data: Prisma.MeetingUpdateInput): Promise<Meeting> {
    return prisma.meeting.update({ where: { id }, data });
  }

  delete(id: string): Promise<Meeting> {
    return prisma.meeting.delete({ where: { id } });
  }

  async list(params: {
    teamIds: string[];
    skip: number;
    take: number;
    orderBy?: Record<string, 'asc' | 'desc'>;
    status?: MeetingStatus;
    from?: Date;
    to?: Date;
  }) {
    const where: Prisma.MeetingWhereInput = {
      teamId: { in: params.teamIds },
      ...(params.status ? { status: params.status } : {}),
      ...(params.from || params.to
        ? {
            scheduledAt: {
              ...(params.from ? { gte: params.from } : {}),
              ...(params.to ? { lte: params.to } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.meeting.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: params.orderBy ?? { scheduledAt: 'desc' },
        include: { createdBy: true, participants: { include: { user: true } } },
      }),
      prisma.meeting.count({ where }),
    ]);

    return { items, total };
  }

  addParticipant(meetingId: string, userId: string, role: ParticipantRole) {
    return prisma.meetingParticipant.upsert({
      where: { meetingId_userId: { meetingId, userId } },
      update: { role },
      create: { meetingId, userId, role },
    });
  }

  updateRsvp(meetingId: string, userId: string, status: RsvpStatus) {
    return prisma.meetingParticipant.update({
      where: { meetingId_userId: { meetingId, userId } },
      data: { rsvpStatus: status },
    });
  }

  findRecurringSeries() {
    return prisma.meeting.findMany({
      where: {
        recurrenceRule: { not: null },
        parentMeetingId: null,
        status: { not: MeetingStatus.CANCELLED },
      },
      include: { occurrences: { orderBy: { scheduledAt: 'desc' }, take: 1 } },
    });
  }
}

export const meetingRepository = new MeetingRepository();

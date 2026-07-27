import { AuditAction, GlobalRole, Meeting, MeetingStatus, ParticipantRole, RsvpStatus } from '@prisma/client';
import { prisma } from '@config/prisma';
import { AppError } from '@common/errors/AppError';
import { buildMeta, parsePagination, PaginationQuery } from '@common/utils/pagination';
import { meetingRepository } from '@modules/meetings/meeting.repository';
import { teamRepository } from '@modules/teams/team.repository';
import { userRepository } from '@modules/users/user.repository';
import { CreateMeetingInput, UpdateMeetingInput, AddParticipantsInput } from '@modules/meetings/meeting.dto';
import { recordAudit } from '@modules/audit/audit.service';
import { notifyMeetingInvite } from '@modules/notifications/notification.service';

export class MeetingService {
  async create(actorId: string, input: CreateMeetingInput): Promise<Meeting> {
    await this.assertTeamMember(input.teamId, actorId);

    const meeting = await meetingRepository.create({
      title: input.title,
      description: input.description,
      scheduledAt: new Date(input.scheduledAt),
      durationMinutes: input.durationMinutes,
      recurrenceRule: input.recurrenceRule,
      team: { connect: { id: input.teamId } },
      createdBy: { connect: { id: actorId } },
    });

    await meetingRepository.addParticipant(meeting.id, actorId, ParticipantRole.ORGANIZER);

    const uniqueParticipantIds = [...new Set(input.participantIds)].filter((id) => id !== actorId);
    for (const userId of uniqueParticipantIds) {
      await meetingRepository.addParticipant(meeting.id, userId, ParticipantRole.ATTENDEE);
    }
    if (uniqueParticipantIds.length > 0) {
      await notifyMeetingInvite(meeting.id, uniqueParticipantIds);
    }

    await recordAudit({ actorId, action: AuditAction.CREATE, entityType: 'Meeting', entityId: meeting.id });
    return meeting;
  }

  async getById(meetingId: string, actorId: string) {
    const meeting = await meetingRepository.findById(meetingId);
    if (!meeting) throw AppError.notFound('Meeting not found');
    await this.assertTeamMember(meeting.teamId, actorId);
    return meeting;
  }

  async list(actorId: string, isAdmin: boolean, query: PaginationQuery & { teamId?: string; status?: MeetingStatus; from?: string; to?: string }) {
    const pagination = parsePagination(query, ['scheduledAt', 'createdAt', 'title']);

    let teamIds: string[];
    if (query.teamId) {
      await this.assertTeamMember(query.teamId, actorId);
      teamIds = [query.teamId];
    } else if (isAdmin) {
      const allTeams = await teamRepository.listForUser({ userId: actorId, isAdmin: true, skip: 0, take: 1000 });
      teamIds = allTeams.items.map((t) => t.id);
    } else {
      const myTeams = await teamRepository.listForUser({ userId: actorId, isAdmin: false, skip: 0, take: 1000 });
      teamIds = myTeams.items.map((t) => t.id);
    }

    const { items, total } = await meetingRepository.list({
      teamIds,
      skip: pagination.skip,
      take: pagination.take,
      orderBy: pagination.orderBy,
      status: query.status,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });

    return { items, meta: buildMeta(pagination.page, pagination.limit, total) };
  }

  async update(meetingId: string, actorId: string, input: UpdateMeetingInput): Promise<Meeting> {
    const meeting = await this.assertCanManage(meetingId, actorId);
    const updated = await meetingRepository.update(meeting.id, {
      ...input,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
    });
    await recordAudit({ actorId, action: AuditAction.UPDATE, entityType: 'Meeting', entityId: meeting.id, diff: input });
    return updated;
  }

  async remove(meetingId: string, actorId: string): Promise<void> {
    const meeting = await this.assertCanManage(meetingId, actorId);
    await meetingRepository.delete(meeting.id);
    await recordAudit({ actorId, action: AuditAction.DELETE, entityType: 'Meeting', entityId: meeting.id });
  }

  async addParticipants(meetingId: string, actorId: string, input: AddParticipantsInput) {
    await this.assertCanManage(meetingId, actorId);
    const results = [];
    for (const p of input.participants) {
      results.push(await meetingRepository.addParticipant(meetingId, p.userId, p.role));
    }
    await notifyMeetingInvite(meetingId, input.participants.map((p) => p.userId));
    return results;
  }

  async updateRsvp(meetingId: string, actorId: string, status: RsvpStatus) {
    await this.getById(meetingId, actorId);
    return meetingRepository.updateRsvp(meetingId, actorId, status);
  }

  async markAttendance(meetingId: string, actorId: string, targetUserId: string) {
    await this.assertCanManage(meetingId, actorId);
    return prisma.attendanceRecord.create({ data: { meetingId, userId: targetUserId } });
  }

  /** Any member of the meeting's team (or an ADMIN) can view it. */
  async assertTeamMember(teamId: string, actorId: string): Promise<void> {
    const actor = await userRepository.findById(actorId);
    if (actor?.role === GlobalRole.ADMIN) return;

    const membership = await teamRepository.findMembership(teamId, actorId);
    if (membership) return;

    const team = await teamRepository.findById(teamId);
    if (team?.ownerId === actorId) return;

    throw AppError.forbidden('You are not a member of this team');
  }

  /** Organizer, team lead, team owner, or ADMIN may modify a meeting. */
  private async assertCanManage(meetingId: string, actorId: string): Promise<Meeting> {
    const meeting = await meetingRepository.findById(meetingId);
    if (!meeting) throw AppError.notFound('Meeting not found');

    const actor = await userRepository.findById(actorId);
    if (actor?.role === GlobalRole.ADMIN) return meeting;
    if (meeting.createdById === actorId) return meeting;

    const membership = await teamRepository.findMembership(meeting.teamId, actorId);
    if (membership?.role === 'LEAD') return meeting;

    const team = await teamRepository.findById(meeting.teamId);
    if (team?.ownerId === actorId) return meeting;

    throw AppError.forbidden('Only the organizer, a team lead, or an admin can modify this meeting');
  }
}

export const meetingService = new MeetingService();

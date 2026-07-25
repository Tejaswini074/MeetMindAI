import crypto from 'crypto';
import { AuditAction, GlobalRole, InvitationStatus, TeamMemberRole } from '@prisma/client';
import { AppError } from '@common/errors/AppError';
import { buildMeta, parsePagination, PaginationQuery } from '@common/utils/pagination';
import { teamRepository } from '@modules/teams/team.repository';
import { userRepository } from '@modules/users/user.repository';
import { CreateTeamInput, InviteMemberInput, UpdateTeamInput } from '@modules/teams/team.dto';
import { recordAudit } from '@modules/audit/audit.service';
import { sendEmail } from '@modules/notifications/services/email.service';
import { env } from '@config/env';

const INVITATION_TTL_DAYS = 7;

export class TeamService {
  async create(ownerId: string, input: CreateTeamInput) {
    const team = await teamRepository.create({
      name: input.name,
      description: input.description,
      owner: { connect: { id: ownerId } },
    });
    await teamRepository.addMember(team.id, ownerId, TeamMemberRole.LEAD);
    await recordAudit({ actorId: ownerId, action: AuditAction.CREATE, entityType: 'Team', entityId: team.id });
    return team;
  }

  async getById(teamId: string) {
    const team = await teamRepository.findById(teamId);
    if (!team) throw AppError.notFound('Team not found');
    return team;
  }

  /** Any team member, the owner, or an ADMIN may read team data. */
  async assertCanView(teamId: string, actorId: string): Promise<void> {
    const actor = await userRepository.findById(actorId);
    if (actor?.role === GlobalRole.ADMIN) return;

    const membership = await teamRepository.findMembership(teamId, actorId);
    if (membership) return;

    const team = await teamRepository.findById(teamId);
    if (team?.ownerId === actorId) return;

    throw AppError.forbidden('You are not a member of this team');
  }

  async list(userId: string, isAdmin: boolean, query: PaginationQuery) {
    const pagination = parsePagination(query, ['name', 'createdAt']);
    const { items, total } = await teamRepository.listForUser({
      userId,
      isAdmin,
      skip: pagination.skip,
      take: pagination.take,
      orderBy: pagination.orderBy,
    });
    return { items, meta: buildMeta(pagination.page, pagination.limit, total) };
  }

  async update(teamId: string, actorId: string, input: UpdateTeamInput) {
    await this.assertCanManage(teamId, actorId);
    const team = await teamRepository.update(teamId, input);
    await recordAudit({ actorId, action: AuditAction.UPDATE, entityType: 'Team', entityId: teamId, diff: input });
    return team;
  }

  async remove(teamId: string, actorId: string): Promise<void> {
    await this.assertCanManage(teamId, actorId);
    await teamRepository.delete(teamId);
    await recordAudit({ actorId, action: AuditAction.DELETE, entityType: 'Team', entityId: teamId });
  }

  async listMembers(teamId: string) {
    return teamRepository.listMembers(teamId);
  }

  async removeMember(teamId: string, actorId: string, targetUserId: string): Promise<void> {
    await this.assertCanManage(teamId, actorId);
    await teamRepository.removeMember(teamId, targetUserId);
    await recordAudit({ actorId, action: AuditAction.DELETE, entityType: 'TeamMember', entityId: targetUserId });
  }

  async updateMemberRole(teamId: string, actorId: string, targetUserId: string, role: TeamMemberRole) {
    await this.assertCanManage(teamId, actorId);
    const member = await teamRepository.updateMemberRole(teamId, targetUserId, role);
    await recordAudit({
      actorId,
      action: AuditAction.UPDATE,
      entityType: 'TeamMember',
      entityId: targetUserId,
      diff: { role },
    });
    return member;
  }

  async invite(teamId: string, actorId: string, input: InviteMemberInput) {
    await this.assertCanManage(teamId, actorId);
    const team = await this.getById(teamId);

    const existingUser = await userRepository.findByEmail(input.email);
    if (existingUser) {
      const existingMembership = await teamRepository.findMembership(teamId, existingUser.id);
      if (existingMembership) {
        throw AppError.conflict('This user is already a member of the team');
      }
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);

    const invitation = await teamRepository.createInvitation({
      email: input.email,
      token,
      expiresAt,
      status: InvitationStatus.PENDING,
      team: { connect: { id: teamId } },
      invitedBy: { connect: { id: actorId } },
    });

    const acceptUrl = `${env.CLIENT_URL}/invitations/${token}`;
    await sendEmail({
      to: input.email,
      subject: `You've been invited to join "${team.name}" on MeetMind`,
      html: `<p>You have been invited to join the team <strong>${team.name}</strong> on MeetMind.</p>
             <p><a href="${acceptUrl}">Click here to accept the invitation</a></p>
             <p>This invitation expires in ${INVITATION_TTL_DAYS} days.</p>`,
    });

    await recordAudit({
      actorId,
      action: AuditAction.INVITE,
      entityType: 'TeamInvitation',
      entityId: invitation.id,
      diff: { email: input.email },
    });

    return invitation;
  }

  async acceptInvitation(token: string, userId: string, userEmail: string) {
    const invitation = await teamRepository.findInvitationByToken(token);
    if (!invitation) throw AppError.notFound('Invitation not found');
    if (invitation.status !== InvitationStatus.PENDING) {
      throw AppError.conflict('This invitation is no longer valid');
    }
    if (invitation.expiresAt < new Date()) {
      await teamRepository.updateInvitation(invitation.id, { status: InvitationStatus.EXPIRED });
      throw AppError.conflict('This invitation has expired');
    }
    if (invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
      throw AppError.forbidden('This invitation was sent to a different email address');
    }

    const existingMembership = await teamRepository.findMembership(invitation.teamId, userId);
    if (!existingMembership) {
      await teamRepository.addMember(invitation.teamId, userId, TeamMemberRole.MEMBER);
    }

    await teamRepository.updateInvitation(invitation.id, { status: InvitationStatus.ACCEPTED });
    await recordAudit({
      actorId: userId,
      action: AuditAction.UPDATE,
      entityType: 'TeamInvitation',
      entityId: invitation.id,
      diff: { status: 'ACCEPTED' },
    });

    return teamRepository.findById(invitation.teamId);
  }

  async listInvitations(teamId: string, actorId: string) {
    await this.assertCanManage(teamId, actorId);
    return teamRepository.listInvitations(teamId);
  }

  /** Owner, ADMIN, or a team member with LEAD role may manage the team. */
  private async assertCanManage(teamId: string, actorId: string): Promise<void> {
    const actor = await userRepository.findById(actorId);
    if (actor?.role === GlobalRole.ADMIN) return;

    const team = await teamRepository.findById(teamId);
    if (!team) throw AppError.notFound('Team not found');
    if (team.ownerId === actorId) return;

    const membership = await teamRepository.findMembership(teamId, actorId);
    if (!membership || membership.role !== TeamMemberRole.LEAD) {
      throw AppError.forbidden('Only the team owner, a team lead, or an admin can perform this action');
    }
  }
}

export const teamService = new TeamService();

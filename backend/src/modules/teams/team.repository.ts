import { Prisma, Team, TeamInvitation, TeamMember, TeamMemberRole } from '@prisma/client';
import { prisma } from '@config/prisma';

export class TeamRepository {
  create(data: Prisma.TeamCreateInput): Promise<Team> {
    return prisma.team.create({ data });
  }

  findById(id: string) {
    return prisma.team.findUnique({
      where: { id },
      include: { members: { include: { user: true } }, owner: true },
    });
  }

  update(id: string, data: Prisma.TeamUpdateInput): Promise<Team> {
    return prisma.team.update({ where: { id }, data });
  }

  delete(id: string): Promise<Team> {
    return prisma.team.delete({ where: { id } });
  }

  async listForUser(params: {
    userId: string;
    isAdmin: boolean;
    skip: number;
    take: number;
    orderBy?: Record<string, 'asc' | 'desc'>;
  }): Promise<{ items: Team[]; total: number }> {
    const where: Prisma.TeamWhereInput = params.isAdmin
      ? {}
      : { members: { some: { userId: params.userId } } };

    const [items, total] = await Promise.all([
      prisma.team.findMany({ where, skip: params.skip, take: params.take, orderBy: params.orderBy }),
      prisma.team.count({ where }),
    ]);

    return { items, total };
  }

  findMembership(teamId: string, userId: string): Promise<TeamMember | null> {
    return prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } });
  }

  addMember(teamId: string, userId: string, role: TeamMemberRole = TeamMemberRole.MEMBER): Promise<TeamMember> {
    return prisma.teamMember.create({ data: { teamId, userId, role } });
  }

  removeMember(teamId: string, userId: string): Promise<TeamMember> {
    return prisma.teamMember.delete({ where: { teamId_userId: { teamId, userId } } });
  }

  updateMemberRole(teamId: string, userId: string, role: TeamMemberRole): Promise<TeamMember> {
    return prisma.teamMember.update({ where: { teamId_userId: { teamId, userId } }, data: { role } });
  }

  listMembers(teamId: string) {
    return prisma.teamMember.findMany({ where: { teamId }, include: { user: true } });
  }

  createInvitation(data: Prisma.TeamInvitationCreateInput): Promise<TeamInvitation> {
    return prisma.teamInvitation.create({ data });
  }

  findInvitationByToken(token: string): Promise<TeamInvitation | null> {
    return prisma.teamInvitation.findUnique({ where: { token } });
  }

  updateInvitation(id: string, data: Prisma.TeamInvitationUpdateInput): Promise<TeamInvitation> {
    return prisma.teamInvitation.update({ where: { id }, data });
  }

  listInvitations(teamId: string): Promise<TeamInvitation[]> {
    return prisma.teamInvitation.findMany({ where: { teamId }, orderBy: { createdAt: 'desc' } });
  }
}

export const teamRepository = new TeamRepository();

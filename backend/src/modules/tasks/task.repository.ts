import { Prisma, Task, TaskStatus } from '@prisma/client';
import { prisma } from '@config/prisma';

const fullInclude = {
  assignee: true,
  createdBy: true,
  comments: { include: { user: true }, orderBy: { createdAt: 'asc' } },
  attachments: { include: { uploadedBy: true } },
} satisfies Prisma.TaskInclude;

export class TaskRepository {
  create(data: Prisma.TaskCreateInput): Promise<Task> {
    return prisma.task.create({ data });
  }

  findById(id: string) {
    return prisma.task.findUnique({ where: { id }, include: fullInclude });
  }

  update(id: string, data: Prisma.TaskUpdateInput): Promise<Task> {
    return prisma.task.update({ where: { id }, data });
  }

  delete(id: string): Promise<Task> {
    return prisma.task.delete({ where: { id } });
  }

  async list(params: {
    teamId: string;
    skip: number;
    take: number;
    orderBy?: Record<string, 'asc' | 'desc'>;
    status?: TaskStatus;
    assigneeId?: string;
  }) {
    const where: Prisma.TaskWhereInput = {
      teamId: params.teamId,
      ...(params.status ? { status: params.status } : {}),
      ...(params.assigneeId ? { assigneeId: params.assigneeId } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: params.orderBy ?? [{ status: 'asc' }, { position: 'asc' }],
        include: { assignee: true, createdBy: true },
      }),
      prisma.task.count({ where }),
    ]);

    return { items, total };
  }

  /** All tasks for a team grouped for the Kanban board (no pagination — boards render everything). */
  board(teamId: string) {
    return prisma.task.findMany({
      where: { teamId },
      orderBy: [{ status: 'asc' }, { position: 'asc' }],
      include: { assignee: true, createdBy: true },
    });
  }

  async nextPosition(teamId: string, status: TaskStatus): Promise<number> {
    const last = await prisma.task.findFirst({
      where: { teamId, status },
      orderBy: { position: 'desc' },
    });
    return (last?.position ?? -1) + 1;
  }

  addComment(taskId: string, userId: string, content: string) {
    return prisma.taskComment.create({ data: { taskId, userId, content }, include: { user: true } });
  }

  addAttachment(data: Prisma.TaskAttachmentCreateInput) {
    return prisma.taskAttachment.create({ data, include: { uploadedBy: true } });
  }
}

export const taskRepository = new TaskRepository();

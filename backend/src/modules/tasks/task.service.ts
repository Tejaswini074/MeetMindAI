import { randomUUID } from 'crypto';
import { AuditAction, GlobalRole, Task, TaskStatus, TeamMemberRole } from '@prisma/client';
import { AppError } from '@common/errors/AppError';
import { buildMeta, parsePagination, PaginationQuery } from '@common/utils/pagination';
import { taskRepository } from '@modules/tasks/task.repository';
import { teamRepository } from '@modules/teams/team.repository';
import { userRepository } from '@modules/users/user.repository';
import { getStorageProvider } from '@common/storage';
import { CreateTaskInput, UpdateTaskInput } from '@modules/tasks/task.dto';
import { recordAudit } from '@modules/audit/audit.service';
import { notifyTaskAssigned, notifyTaskComment } from '@modules/notifications/notification.service';
import { emitTaskEvent } from '@sockets/emitters';

export class TaskService {
  async create(actorId: string, input: CreateTaskInput): Promise<Task> {
    await this.assertTeamMember(input.teamId, actorId);
    const position = await taskRepository.nextPosition(input.teamId, TaskStatus.TODO);

    const task = await taskRepository.create({
      title: input.title,
      description: input.description,
      priority: input.priority,
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      position,
      team: { connect: { id: input.teamId } },
      createdBy: { connect: { id: actorId } },
      ...(input.meetingId ? { meeting: { connect: { id: input.meetingId } } } : {}),
      ...(input.assigneeId ? { assignee: { connect: { id: input.assigneeId } } } : {}),
    });

    if (input.assigneeId) {
      await notifyTaskAssigned(task.id, input.assigneeId);
    }

    emitTaskEvent(input.teamId, 'task:created', task);
    await recordAudit({ actorId, action: AuditAction.CREATE, entityType: 'Task', entityId: task.id });
    return task;
  }

  async getById(taskId: string, actorId: string) {
    const task = await taskRepository.findById(taskId);
    if (!task) throw AppError.notFound('Task not found');
    await this.assertTeamMember(task.teamId, actorId);
    return task;
  }

  async list(actorId: string, query: PaginationQuery & { teamId: string; status?: TaskStatus; assigneeId?: string }) {
    await this.assertTeamMember(query.teamId, actorId);
    const pagination = parsePagination(query, ['createdAt', 'dueDate', 'priority']);
    const { items, total } = await taskRepository.list({
      teamId: query.teamId,
      skip: pagination.skip,
      take: pagination.take,
      orderBy: pagination.orderBy,
      status: query.status,
      assigneeId: query.assigneeId,
    });
    return { items, meta: buildMeta(pagination.page, pagination.limit, total) };
  }

  async board(teamId: string, actorId: string) {
    await this.assertTeamMember(teamId, actorId);
    return taskRepository.board(teamId);
  }

  async update(taskId: string, actorId: string, input: UpdateTaskInput): Promise<Task> {
    const task = await this.getById(taskId, actorId);
    const wasUnassigned = !task.assigneeId;

    const updated = await taskRepository.update(taskId, {
      ...input,
      dueDate: input.dueDate === undefined ? undefined : input.dueDate ? new Date(input.dueDate) : null,
      assignee: input.assigneeId === undefined ? undefined : input.assigneeId ? { connect: { id: input.assigneeId } } : { disconnect: true },
    });

    if (input.assigneeId && (wasUnassigned || input.assigneeId !== task.assigneeId)) {
      await notifyTaskAssigned(taskId, input.assigneeId);
    }

    emitTaskEvent(task.teamId, 'task:updated', updated);
    await recordAudit({ actorId, action: AuditAction.UPDATE, entityType: 'Task', entityId: taskId, diff: input });
    return updated;
  }

  async move(taskId: string, actorId: string, status: TaskStatus, position: number): Promise<Task> {
    const task = await this.getById(taskId, actorId);
    const updated = await taskRepository.update(taskId, { status, position });
    emitTaskEvent(task.teamId, 'task:moved', { id: task.id, status, position });
    return updated;
  }

  async remove(taskId: string, actorId: string): Promise<void> {
    const task = await this.getById(taskId, actorId);
    await this.assertCanManage(task.teamId, actorId, task.createdById);
    await taskRepository.delete(taskId);
    emitTaskEvent(task.teamId, 'task:deleted', { id: taskId });
    await recordAudit({ actorId, action: AuditAction.DELETE, entityType: 'Task', entityId: taskId });
  }

  async addComment(taskId: string, actorId: string, content: string) {
    const task = await this.getById(taskId, actorId);
    const comment = await taskRepository.addComment(taskId, actorId, content);

    const notifyIds = [task.createdById, task.assigneeId].filter((id): id is string => !!id);
    await notifyTaskComment(taskId, actorId, notifyIds);

    emitTaskEvent(task.teamId, 'task:commented', comment);
    return comment;
  }

  async addAttachment(taskId: string, actorId: string, file: Express.Multer.File) {
    const task = await this.getById(taskId, actorId);
    const storage = getStorageProvider();
    const key = `tasks/${taskId}/${randomUUID()}-${file.originalname}`;
    const saved = await storage.save(file.path, key, file.mimetype);

    const attachment = await taskRepository.addAttachment({
      filePath: saved.key,
      originalName: file.originalname,
      mimeType: file.mimetype,
      task: { connect: { id: taskId } },
      uploadedBy: { connect: { id: actorId } },
    });

    emitTaskEvent(task.teamId, 'task:attachment-added', attachment);
    return attachment;
  }

  async assertTeamMember(teamId: string, actorId: string): Promise<void> {
    const actor = await userRepository.findById(actorId);
    if (actor?.role === GlobalRole.ADMIN) return;

    const membership = await teamRepository.findMembership(teamId, actorId);
    if (membership) return;

    const team = await teamRepository.findById(teamId);
    if (team?.ownerId === actorId) return;

    throw AppError.forbidden('You are not a member of this team');
  }

  private async assertCanManage(teamId: string, actorId: string, taskCreatedById: string): Promise<void> {
    if (actorId === taskCreatedById) return;

    const actor = await userRepository.findById(actorId);
    if (actor?.role === GlobalRole.ADMIN) return;

    const membership = await teamRepository.findMembership(teamId, actorId);
    if (membership?.role === TeamMemberRole.LEAD) return;

    throw AppError.forbidden('Only the task creator, a team lead, or an admin can delete this task');
  }
}

export const taskService = new TaskService();

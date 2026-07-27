import { Request, Response } from 'express';
import { asyncHandler } from '@common/utils/asyncHandler';
import { sendSuccess } from '@common/utils/response';
import { AppError } from '@common/errors/AppError';
import { taskService } from '@modules/tasks/task.service';

export const createTask = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const task = await taskService.create(req.user.id, req.body);
  sendSuccess(res, task, 201);
});

export const listTasks = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const { items, meta } = await taskService.list(req.user.id, req.query as never);
  sendSuccess(res, items, 200, meta);
});

export const getBoard = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const board = await taskService.board(req.query.teamId as string, req.user.id);
  sendSuccess(res, board);
});

export const getTask = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const task = await taskService.getById(req.params.id, req.user.id);
  sendSuccess(res, task);
});

export const updateTask = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const task = await taskService.update(req.params.id, req.user.id, req.body);
  sendSuccess(res, task);
});

export const moveTask = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const task = await taskService.move(req.params.id, req.user.id, req.body.status, req.body.position);
  sendSuccess(res, task);
});

export const deleteTask = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  await taskService.remove(req.params.id, req.user.id);
  sendSuccess(res, { deleted: true });
});

export const addComment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const comment = await taskService.addComment(req.params.id, req.user.id, req.body.content);
  sendSuccess(res, comment, 201);
});

export const addAttachment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  if (!req.file) throw AppError.badRequest('No file uploaded');
  const attachment = await taskService.addAttachment(req.params.id, req.user.id, req.file);
  sendSuccess(res, attachment, 201);
});

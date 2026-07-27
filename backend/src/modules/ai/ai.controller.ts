import { Request, Response } from 'express';
import { asyncHandler } from '@common/utils/asyncHandler';
import { sendSuccess } from '@common/utils/response';
import { AppError } from '@common/errors/AppError';
import { aiService } from '@modules/ai/ai.service';

export const summarizeMeeting = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const summary = await aiService.generateSummary(req.params.id, req.user.id);
  sendSuccess(res, summary, 201);
});

export const extractActionItems = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const actionItems = await aiService.generateActionItems(req.params.id, req.user.id);
  sendSuccess(res, actionItems, 201);
});

export const analyzeSentiment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const sentiment = await aiService.analyzeSentiment(req.params.id, req.user.id);
  sendSuccess(res, sentiment);
});

export const askAboutMeeting = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const result = await aiService.askQuestion(req.user.id, req.body.question, req.params.id);
  sendSuccess(res, result);
});

export const askAssistant = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const result = await aiService.askQuestion(req.user.id, req.body.question);
  sendSuccess(res, result);
});

import { Request, Response } from 'express';
import { GlobalRole } from '@prisma/client';
import { asyncHandler } from '@common/utils/asyncHandler';
import { sendSuccess } from '@common/utils/response';
import { AppError } from '@common/errors/AppError';
import { meetingService } from '@modules/meetings/meeting.service';
import { handleAudioUpload, handleTranscriptUpload } from '@modules/meetings/meeting.upload.service';

export const createMeeting = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const meeting = await meetingService.create(req.user.id, req.body);
  sendSuccess(res, meeting, 201);
});

export const listMeetings = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const { items, meta } = await meetingService.list(
    req.user.id,
    req.user.role === GlobalRole.ADMIN,
    req.query as Record<string, string>,
  );
  sendSuccess(res, items, 200, meta);
});

export const getMeeting = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const meeting = await meetingService.getById(req.params.id, req.user.id);
  sendSuccess(res, meeting);
});

export const updateMeeting = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const meeting = await meetingService.update(req.params.id, req.user.id, req.body);
  sendSuccess(res, meeting);
});

export const deleteMeeting = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  await meetingService.remove(req.params.id, req.user.id);
  sendSuccess(res, { deleted: true });
});

export const addParticipants = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const participants = await meetingService.addParticipants(req.params.id, req.user.id, req.body);
  sendSuccess(res, participants, 201);
});

export const updateRsvp = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const rsvp = await meetingService.updateRsvp(req.params.id, req.user.id, req.body.status);
  sendSuccess(res, rsvp);
});

export const markAttendance = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const record = await meetingService.markAttendance(req.params.id, req.user.id, req.body.userId);
  sendSuccess(res, record, 201);
});

export const uploadAudio = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  await meetingService.getById(req.params.id, req.user.id);
  if (!req.file) throw AppError.badRequest('No audio file uploaded');
  const audio = await handleAudioUpload(req.params.id, req.file, req.body.language);
  sendSuccess(res, audio, 202);
});

export const uploadTranscript = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  await meetingService.getById(req.params.id, req.user.id);
  if (!req.file) throw AppError.badRequest('No transcript file uploaded');
  const transcript = await handleTranscriptUpload(req.params.id, req.file);
  sendSuccess(res, transcript, 201);
});

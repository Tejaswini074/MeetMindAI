import { Request, Response } from 'express';
import { asyncHandler } from '@common/utils/asyncHandler';
import { sendSuccess } from '@common/utils/response';
import { AppError } from '@common/errors/AppError';
import { env } from '@config/env';
import { getGoogleAuthUrl, handleGoogleCallback, syncMeetingToGoogleCalendar } from '@modules/calendar/calendar.service';

export const connectGoogle = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const url = getGoogleAuthUrl(req.user.id);
  sendSuccess(res, { authUrl: url });
});

export const googleCallback = asyncHandler(async (req: Request, res: Response) => {
  const { code, state } = req.query as { code: string; state: string };
  await handleGoogleCallback(code, state);
  res.redirect(`${env.CLIENT_URL}/settings/integrations?calendar=connected`);
});

export const syncMeeting = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const eventId = await syncMeetingToGoogleCalendar(req.params.meetingId, req.user.id);
  sendSuccess(res, { calendarEventId: eventId });
});

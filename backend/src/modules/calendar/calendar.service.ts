import jwt from 'jsonwebtoken';
import { google } from 'googleapis';
import { CalendarProvider } from '@prisma/client';
import { env } from '@config/env';
import { prisma } from '@config/prisma';
import { AppError } from '@common/errors/AppError';
import { logger } from '@common/utils/logger';
import { meetingService } from '@modules/meetings/meeting.service';

const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

function assertGoogleConfigured(): void {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI) {
    throw AppError.internal(
      'Google Calendar integration is not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI missing)',
    );
  }
}

function getOAuthClient() {
  assertGoogleConfigured();
  return new google.auth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_REDIRECT_URI);
}

/** Only this server issues/consumes this token, so a short-lived HMAC-signed state is sufficient CSRF protection. */
export function getGoogleAuthUrl(userId: string): string {
  const client = getOAuthClient();
  const state = jwt.sign({ userId }, env.JWT_ACCESS_SECRET, { expiresIn: '10m' });
  return client.generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: SCOPES, state });
}

export async function handleGoogleCallback(code: string, state: string): Promise<void> {
  let userId: string;
  try {
    const payload = jwt.verify(state, env.JWT_ACCESS_SECRET) as { userId: string };
    userId = payload.userId;
  } catch {
    throw AppError.badRequest('Invalid or expired OAuth state');
  }

  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.access_token) {
    throw AppError.badRequest('Google did not return an access token');
  }

  await prisma.calendarIntegration.upsert({
    where: { userId_provider: { userId, provider: CalendarProvider.GOOGLE } },
    update: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? undefined,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
    },
    create: {
      userId,
      provider: CalendarProvider.GOOGLE,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? undefined,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
    },
  });
}

export async function syncMeetingToGoogleCalendar(meetingId: string, userId: string): Promise<string> {
  const integration = await prisma.calendarIntegration.findUnique({
    where: { userId_provider: { userId, provider: CalendarProvider.GOOGLE } },
  });
  if (!integration) {
    throw AppError.badRequest('Connect your Google Calendar first via GET /calendar/google/connect');
  }

  const meeting = await meetingService.getById(meetingId, userId);

  const client = getOAuthClient();
  client.setCredentials({ access_token: integration.accessToken, refresh_token: integration.refreshToken ?? undefined });

  const calendar = google.calendar({ version: 'v3', auth: client });
  const endTime = new Date(meeting.scheduledAt.getTime() + meeting.durationMinutes * 60 * 1000);

  const requestBody = {
    summary: meeting.title,
    description: meeting.description ?? undefined,
    start: { dateTime: meeting.scheduledAt.toISOString() },
    end: { dateTime: endTime.toISOString() },
  };

  let eventId: string;
  try {
    if (meeting.calendarEventId) {
      const updated = await calendar.events.update({
        calendarId: 'primary',
        eventId: meeting.calendarEventId,
        requestBody,
      });
      eventId = updated.data.id as string;
    } else {
      const created = await calendar.events.insert({ calendarId: 'primary', requestBody });
      eventId = created.data.id as string;
    }
  } catch (err) {
    logger.error('Google Calendar sync failed', { err, meetingId });
    throw AppError.internal('Failed to sync meeting to Google Calendar');
  }

  await prisma.meeting.update({ where: { id: meetingId }, data: { calendarEventId: eventId } });
  return eventId;
}

import { Router } from 'express';
import { authenticate } from '@middlewares/auth.middleware';
import { validate } from '@middlewares/validate.middleware';
import { connectGoogle, googleCallback, syncMeeting } from '@modules/calendar/calendar.controller';
import { oauthCallbackSchema, syncMeetingSchema } from '@modules/calendar/calendar.dto';

const router = Router();

/**
 * @openapi
 * /calendar/google/connect:
 *   get:
 *     summary: Get the Google OAuth2 consent URL to connect your calendar
 *     tags: [Calendar]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */
router.get('/google/connect', authenticate, connectGoogle);

/**
 * @openapi
 * /calendar/google/callback:
 *   get:
 *     summary: Google OAuth2 redirect target — exchanges the code and stores tokens
 *     tags: [Calendar]
 *     responses:
 *       302: { description: Redirects back to the client app }
 */
router.get('/google/callback', validate(oauthCallbackSchema), googleCallback);

/**
 * @openapi
 * /calendar/google/sync/{meetingId}:
 *   post:
 *     summary: Create/update a Google Calendar event for a meeting
 *     tags: [Calendar]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */
router.post('/google/sync/:meetingId', authenticate, validate(syncMeetingSchema), syncMeeting);

export default router;

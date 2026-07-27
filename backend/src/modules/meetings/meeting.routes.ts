import { Router } from 'express';
import { authenticate } from '@middlewares/auth.middleware';
import { validate } from '@middlewares/validate.middleware';
import { uploadAudio as uploadAudioMiddleware, uploadTranscript as uploadTranscriptMiddleware } from '@middlewares/upload.middleware';
import {
  createMeeting,
  listMeetings,
  getMeeting,
  updateMeeting,
  deleteMeeting,
  addParticipants,
  updateRsvp,
  markAttendance,
  uploadAudio,
  uploadTranscript,
} from '@modules/meetings/meeting.controller';
import {
  createMeetingSchema,
  updateMeetingSchema,
  meetingIdParamSchema,
  listMeetingsSchema,
  addParticipantsSchema,
  updateRsvpSchema,
  markAttendanceSchema,
} from '@modules/meetings/meeting.dto';
import {
  summarizeMeeting,
  extractActionItems,
  analyzeSentiment,
  askAboutMeeting,
} from '@modules/ai/ai.controller';
import { meetingAiActionSchema, meetingQaSchema } from '@modules/ai/ai.dto';
import { exportMeeting } from '@modules/export/export.controller';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /meetings:
 *   post:
 *     summary: Schedule a new meeting
 *     tags: [Meetings]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Created }
 *   get:
 *     summary: List meetings for the current user's teams
 *     tags: [Meetings]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */
router.post('/', validate(createMeetingSchema), createMeeting);
router.get('/', validate(listMeetingsSchema), listMeetings);

/**
 * @openapi
 * /meetings/{id}:
 *   get:
 *     summary: Get a meeting by id (includes transcripts, summaries, action items)
 *     tags: [Meetings]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */
router.get('/:id', validate(meetingIdParamSchema), getMeeting);
router.patch('/:id', validate(updateMeetingSchema), updateMeeting);
router.delete('/:id', validate(meetingIdParamSchema), deleteMeeting);

router.post('/:id/participants', validate(addParticipantsSchema), addParticipants);
router.patch('/:id/rsvp', validate(updateRsvpSchema), updateRsvp);
router.post('/:id/attendance', validate(markAttendanceSchema), markAttendance);

/**
 * @openapi
 * /meetings/{id}/upload-audio:
 *   post:
 *     summary: Upload a meeting audio recording (triggers async Whisper transcription)
 *     tags: [Meetings]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 *               language: { type: string }
 *     responses:
 *       202: { description: Accepted, processing in background }
 */
router.post('/:id/upload-audio', uploadAudioMiddleware.single('file'), uploadAudio);

/**
 * @openapi
 * /meetings/{id}/upload-transcript:
 *   post:
 *     summary: Upload an offline transcript file (TXT, DOCX, or PDF)
 *     tags: [Meetings]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 *     responses:
 *       201: { description: Created }
 */
router.post('/:id/upload-transcript', uploadTranscriptMiddleware.single('file'), uploadTranscript);

/**
 * @openapi
 * /meetings/{id}/summarize:
 *   post:
 *     summary: Generate an AI summary of the meeting transcript
 *     tags: [AI]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Created }
 */
router.post('/:id/summarize', validate(meetingAiActionSchema), summarizeMeeting);

/**
 * @openapi
 * /meetings/{id}/action-items:
 *   post:
 *     summary: Extract action items from the meeting transcript (auto-creates Kanban tasks)
 *     tags: [AI]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Created }
 */
router.post('/:id/action-items', validate(meetingAiActionSchema), extractActionItems);

/**
 * @openapi
 * /meetings/{id}/sentiment:
 *   post:
 *     summary: Analyze the overall sentiment of the meeting transcript
 *     tags: [AI]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */
router.post('/:id/sentiment', validate(meetingAiActionSchema), analyzeSentiment);

/**
 * @openapi
 * /meetings/{id}/qa:
 *   post:
 *     summary: Ask a question about this specific meeting (RAG over its transcript)
 *     tags: [AI]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */
router.post('/:id/qa', validate(meetingQaSchema), askAboutMeeting);

/**
 * @openapi
 * /meetings/{id}/export:
 *   get:
 *     summary: Export a meeting report as PDF or DOCX
 *     tags: [Meetings]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: format
 *         schema: { type: string, enum: [pdf, docx] }
 *     responses:
 *       200: { description: OK }
 */
router.get('/:id/export', validate(meetingIdParamSchema), exportMeeting);

export default router;

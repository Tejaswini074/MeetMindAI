import os from 'os';
import multer from 'multer';
import { env } from '@config/env';
import { AppError } from '@common/errors/AppError';

const AUDIO_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/webm',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/ogg',
];

const TRANSCRIPT_MIME_TYPES = [
  'text/plain',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const ATTACHMENT_MIME_TYPES = [
  ...AUDIO_MIME_TYPES,
  ...TRANSCRIPT_MIME_TYPES,
  'image/png',
  'image/jpeg',
  'image/gif',
  'application/zip',
  'application/json',
];

function fileFilterFor(allowed: string[]) {
  return (
    _req: Express.Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback,
  ): void => {
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(AppError.badRequest(`Unsupported file type: ${file.mimetype}`));
    }
  };
}

const storage = multer.diskStorage({ destination: os.tmpdir() });
const maxSize = env.MAX_UPLOAD_SIZE_MB * 1024 * 1024;

export const uploadAudio = multer({
  storage,
  limits: { fileSize: maxSize },
  fileFilter: fileFilterFor(AUDIO_MIME_TYPES),
});

export const uploadTranscript = multer({
  storage,
  limits: { fileSize: maxSize },
  fileFilter: fileFilterFor(TRANSCRIPT_MIME_TYPES),
});

export const uploadAttachment = multer({
  storage,
  limits: { fileSize: maxSize },
  fileFilter: fileFilterFor(ATTACHMENT_MIME_TYPES),
});

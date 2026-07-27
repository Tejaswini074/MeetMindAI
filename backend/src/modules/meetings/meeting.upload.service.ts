import fs from 'fs/promises';
import { randomUUID } from 'crypto';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import { TranscriptSource } from '@prisma/client';
import { prisma } from '@config/prisma';
import { AppError } from '@common/errors/AppError';
import { logger } from '@common/utils/logger';
import { getStorageProvider } from '@common/storage';
import { transcribeMeetingAudio } from '@modules/ai/services/transcription.service';
import { embedTranscript } from '@modules/ai/services/transcriptEmbedding.service';

export async function handleAudioUpload(meetingId: string, file: Express.Multer.File, language?: string) {
  const storage = getStorageProvider();
  const key = `audio/${meetingId}/${randomUUID()}-${file.originalname}`;
  const saved = await storage.save(file.path, key, file.mimetype);

  const audio = await prisma.meetingAudio.create({
    data: {
      meetingId,
      filePath: saved.key,
      originalName: file.originalname,
      mimeType: file.mimetype,
      language,
    },
  });

  // Fire-and-forget: transcription + AI processing happen out-of-band so the upload responds immediately.
  transcribeMeetingAudio(audio.id).catch((err) => {
    logger.error('Background transcription failed', { err, audioId: audio.id });
  });

  return audio;
}

export async function handleTranscriptUpload(meetingId: string, file: Express.Multer.File) {
  let fullText: string;
  let source: TranscriptSource;

  switch (file.mimetype) {
    case 'text/plain':
      fullText = await fs.readFile(file.path, 'utf-8');
      source = TranscriptSource.UPLOAD_TXT;
      break;
    case 'application/pdf': {
      const buffer = await fs.readFile(file.path);
      const parsed = await pdfParse(buffer);
      fullText = parsed.text;
      source = TranscriptSource.UPLOAD_PDF;
      break;
    }
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
      const result = await mammoth.extractRawText({ path: file.path });
      fullText = result.value;
      source = TranscriptSource.UPLOAD_DOCX;
      break;
    }
    default:
      throw AppError.badRequest(`Unsupported transcript file type: ${file.mimetype}`);
  }

  await fs.unlink(file.path).catch(() => undefined);

  if (!fullText.trim()) {
    throw AppError.unprocessable('The uploaded file did not contain any extractable text');
  }

  const transcript = await prisma.transcript.create({
    data: { meetingId, source, fullText },
  });

  embedTranscript(transcript.id).catch((err) =>
    logger.error('Background embedding failed for uploaded transcript', { err, transcriptId: transcript.id }),
  );

  return transcript;
}

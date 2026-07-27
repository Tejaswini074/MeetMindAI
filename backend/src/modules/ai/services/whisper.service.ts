import fs from 'fs';
import { toFile } from 'openai';
import { env } from '@config/env';
import { getOpenAIClient } from '@modules/ai/services/openai.client';

export interface TranscriptionSegment {
  speakerLabel: string;
  startTime: number;
  endTime: number;
  text: string;
}

export interface TranscriptionResult {
  fullText: string;
  language: string | null;
  segments: TranscriptionSegment[];
}

/**
 * Transcribes a full audio file. Whisper does not diarize, so every segment is
 * labeled "Unknown" — a real DiarizationProvider can be plugged in later to
 * populate speakerLabel accurately.
 */
export async function transcribeAudioFile(localPath: string, language?: string): Promise<TranscriptionResult> {
  const client = getOpenAIClient();

  const response = await client.audio.transcriptions.create({
    file: fs.createReadStream(localPath),
    model: env.OPENAI_WHISPER_MODEL,
    language,
    response_format: 'verbose_json',
  });

  const raw = response as unknown as {
    text: string;
    language?: string;
    segments?: { start: number; end: number; text: string }[];
  };

  return {
    fullText: raw.text,
    language: raw.language ?? language ?? null,
    segments: (raw.segments ?? []).map((s) => ({
      speakerLabel: 'Unknown',
      startTime: s.start,
      endTime: s.end,
      text: s.text.trim(),
    })),
  };
}

/** Transcribes a short in-memory audio chunk for near-real-time live transcription over Socket.IO. */
export async function transcribeAudioBuffer(
  buffer: Buffer,
  mimeType: string,
  language?: string,
): Promise<string> {
  const client = getOpenAIClient();
  const extension = mimeType.split('/')[1]?.split(';')[0] ?? 'webm';
  const file = await toFile(buffer, `chunk.${extension}`);

  const response = await client.audio.transcriptions.create({
    file,
    model: env.OPENAI_WHISPER_MODEL,
    language,
  });

  return response.text;
}

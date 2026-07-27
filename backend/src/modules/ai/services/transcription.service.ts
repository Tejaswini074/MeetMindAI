import fs from 'fs/promises';
import { AiFeature, AudioProcessingStatus, TranscriptSource } from '@prisma/client';
import { env } from '@config/env';
import { prisma } from '@config/prisma';
import { logger } from '@common/utils/logger';
import { getStorageProvider } from '@common/storage';
import { transcribeAudioFile } from '@modules/ai/services/whisper.service';
import { embedTranscript } from '@modules/ai/services/transcriptEmbedding.service';
import { logAiUsage } from '@modules/ai/services/aiUsage.service';
import { runPostTranscriptionPipeline } from '@modules/ai/ai.service';

export async function transcribeMeetingAudio(audioId: string): Promise<void> {
  const audio = await prisma.meetingAudio.findUnique({ where: { id: audioId } });
  if (!audio) return;

  await prisma.meetingAudio.update({ where: { id: audioId }, data: { status: AudioProcessingStatus.PROCESSING } });

  const storage = getStorageProvider();
  let localPath: string | null = null;

  try {
    localPath = await storage.toLocalPath(audio.filePath);
    const result = await transcribeAudioFile(localPath, audio.language ?? undefined);

    const transcript = await prisma.transcript.create({
      data: {
        meetingId: audio.meetingId,
        source: TranscriptSource.WHISPER,
        language: result.language,
        fullText: result.fullText,
        segments: {
          create: result.segments.map((s) => ({
            speakerLabel: s.speakerLabel,
            startTime: s.startTime,
            endTime: s.endTime,
            text: s.text,
          })),
        },
      },
    });

    const durationSeconds = result.segments.length
      ? Math.round(result.segments[result.segments.length - 1].endTime)
      : null;

    await prisma.meetingAudio.update({
      where: { id: audioId },
      data: { status: AudioProcessingStatus.DONE, durationSeconds, language: result.language },
    });

    await logAiUsage({ feature: AiFeature.TRANSCRIPTION, model: env.OPENAI_WHISPER_MODEL, meetingId: audio.meetingId });

    // Best-effort follow-on AI steps — failures here must not mark the transcription itself as failed.
    await embedTranscript(transcript.id).catch((err) =>
      logger.error('Embedding step failed', { err, transcriptId: transcript.id }),
    );
    await runPostTranscriptionPipeline(audio.meetingId).catch((err) =>
      logger.error('Post-transcription AI pipeline failed', { err, meetingId: audio.meetingId }),
    );
  } catch (err) {
    logger.error('Transcription failed', { err, audioId });
    await prisma.meetingAudio.update({
      where: { id: audioId },
      data: { status: AudioProcessingStatus.FAILED, failureReason: (err as Error).message?.slice(0, 500) },
    });
  } finally {
    if (localPath && env.STORAGE_DRIVER === 's3') {
      await fs.unlink(localPath).catch(() => undefined);
    }
  }
}

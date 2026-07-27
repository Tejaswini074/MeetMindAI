import { prisma } from '@config/prisma';
import { logger } from '@common/utils/logger';
import { embedText } from '@modules/ai/services/embedding.service';

const CHUNK_SIZE = 800;

function chunkText(text: string, size: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks.filter((c) => c.trim().length > 0);
}

/**
 * Embeds a transcript's segments for semantic search / RAG Q&A. Whisper-sourced
 * transcripts already have timed segments; uploaded transcripts (TXT/DOCX/PDF) have
 * none, so we synthesize paragraph-sized chunks first.
 */
export async function embedTranscript(transcriptId: string): Promise<void> {
  const transcript = await prisma.transcript.findUnique({
    where: { id: transcriptId },
    include: { segments: true },
  });
  if (!transcript) return;

  try {
    if (transcript.segments.length === 0) {
      const chunks = chunkText(transcript.fullText, CHUNK_SIZE);
      for (let i = 0; i < chunks.length; i++) {
        const embedding = await embedText(chunks[i]);
        await prisma.transcriptSegment.create({
          data: {
            transcriptId,
            speakerLabel: 'Unknown',
            startTime: i,
            endTime: i + 1,
            text: chunks[i],
            embedding,
          },
        });
      }
    } else {
      for (const segment of transcript.segments) {
        const embedding = await embedText(segment.text);
        await prisma.transcriptSegment.update({ where: { id: segment.id }, data: { embedding } });
      }
    }
  } catch (err) {
    logger.error('Failed to embed transcript segments', { err, transcriptId });
  }
}

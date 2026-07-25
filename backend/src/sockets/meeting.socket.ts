import { Server as SocketIOServer, Socket } from 'socket.io';
import { prisma } from '@config/prisma';
import { logger } from '@common/utils/logger';
import { transcribeAudioBuffer } from '@modules/ai/services/whisper.service';

interface JoinMeetingPayload {
  meetingId: string;
}

interface AudioChunkPayload {
  meetingId: string;
  chunk: ArrayBuffer | Buffer;
  mimeType?: string;
  language?: string;
}

export function registerMeetingHandlers(io: SocketIOServer, socket: Socket): void {
  const userId: string = socket.data.user.id;

  socket.on('meeting:join', async ({ meetingId }: JoinMeetingPayload) => {
    socket.join(`meeting:${meetingId}`);
    const attendance = await prisma.attendanceRecord.create({
      data: { meetingId, userId },
    });
    socket.data.attendanceId = attendance.id;
    io.to(`meeting:${meetingId}`).emit('meeting:attendance:joined', {
      meetingId,
      userId,
      joinedAt: attendance.joinedAt,
    });
  });

  socket.on('meeting:leave', async ({ meetingId }: JoinMeetingPayload) => {
    await markLeft(socket, meetingId);
    socket.leave(`meeting:${meetingId}`);
  });

  socket.on('meeting:audio-chunk', async ({ meetingId, chunk, mimeType, language }: AudioChunkPayload) => {
    try {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as ArrayBuffer);
      const partialText = await transcribeAudioBuffer(buffer, mimeType ?? 'audio/webm', language);
      io.to(`meeting:${meetingId}`).emit('meeting:transcript-partial', {
        meetingId,
        text: partialText,
        at: new Date().toISOString(),
      });
    } catch (err) {
      logger.error('Live transcription chunk failed', { err, meetingId });
      socket.emit('meeting:transcript-error', { meetingId, message: 'Failed to transcribe chunk' });
    }
  });

  socket.on('disconnecting', async () => {
    for (const room of socket.rooms) {
      if (room.startsWith('meeting:')) {
        const meetingId = room.replace('meeting:', '');
        await markLeft(socket, meetingId);
      }
    }
  });
}

async function markLeft(socket: Socket, meetingId: string): Promise<void> {
  const userId: string = socket.data.user.id;
  if (!socket.data.attendanceId) return;
  await prisma.attendanceRecord
    .update({ where: { id: socket.data.attendanceId }, data: { leftAt: new Date() } })
    .catch(() => undefined);
  socket.to(`meeting:${meetingId}`).emit('meeting:attendance:left', {
    meetingId,
    userId,
    leftAt: new Date().toISOString(),
  });
}

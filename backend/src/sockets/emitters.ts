import { getIO } from '@sockets/index';
import { logger } from '@common/utils/logger';

function safeEmit(fn: () => void): void {
  try {
    fn();
  } catch (err) {
    logger.warn('Socket emit skipped (io not ready)', { err: (err as Error).message });
  }
}

export function emitTaskEvent(teamId: string, event: string, payload: unknown): void {
  safeEmit(() => getIO().to(`team:${teamId}`).emit(event, payload));
}

export function emitToUser(userId: string, event: string, payload: unknown): void {
  safeEmit(() => getIO().to(`user:${userId}`).emit(event, payload));
}

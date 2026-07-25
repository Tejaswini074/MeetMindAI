import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { env } from '@config/env';
import { logger } from '@common/utils/logger';
import { registerSocketAuth } from '@sockets/socket.auth';
import { registerMeetingHandlers } from '@sockets/meeting.socket';
import { registerTaskHandlers } from '@sockets/task.socket';

let io: SocketIOServer | null = null;

export function initSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: { origin: env.CLIENT_URL, credentials: true },
  });

  registerSocketAuth(io);

  io.on('connection', (socket) => {
    logger.debug(`Socket connected: ${socket.id} (user ${socket.data.user?.id})`);

    socket.join(`user:${socket.data.user.id}`);

    registerMeetingHandlers(io as SocketIOServer, socket);
    registerTaskHandlers(io as SocketIOServer, socket);

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: ${socket.id}`);
    });
  });

  logger.info('Socket.IO initialized');
  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.IO has not been initialized yet');
  }
  return io;
}

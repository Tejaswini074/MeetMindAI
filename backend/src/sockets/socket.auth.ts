import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAccessToken } from '@common/utils/jwt';

export function registerSocketAuth(io: SocketIOServer): void {
  io.use((socket: Socket, next) => {
    try {
      const token =
        (socket.handshake.auth?.token as string | undefined) ||
        (socket.handshake.headers.authorization?.toString().replace('Bearer ', '') as
          | string
          | undefined);

      if (!token) {
        next(new Error('Authentication token missing'));
        return;
      }

      const payload = verifyAccessToken(token);
      socket.data.user = { id: payload.sub, email: payload.email, role: payload.role };
      next();
    } catch {
      next(new Error('Invalid or expired authentication token'));
    }
  });
}

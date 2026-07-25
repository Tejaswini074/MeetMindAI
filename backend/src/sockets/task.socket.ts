import { Server as SocketIOServer, Socket } from 'socket.io';

interface JoinTeamPayload {
  teamId: string;
}

export function registerTaskHandlers(_io: SocketIOServer, socket: Socket): void {
  socket.on('team:join', ({ teamId }: JoinTeamPayload) => {
    socket.join(`team:${teamId}`);
  });

  socket.on('team:leave', ({ teamId }: JoinTeamPayload) => {
    socket.leave(`team:${teamId}`);
  });
}

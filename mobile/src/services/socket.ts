import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL ?? 'http://localhost:4000';

let socket: Socket | null = null;

export function connectSocket(accessToken: string): Socket {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: { token: accessToken },
    transports: ['websocket'],
  });

  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

export function getSocket(): Socket | null {
  return socket;
}

// --- Typed helpers mirroring backend/src/sockets/{meeting,task}.socket.ts events ---

export function joinMeeting(meetingId: string): void {
  socket?.emit('meeting:join', { meetingId });
}

export function leaveMeeting(meetingId: string): void {
  socket?.emit('meeting:leave', { meetingId });
}

export function sendAudioChunk(meetingId: string, chunk: ArrayBuffer, mimeType: string): void {
  socket?.emit('meeting:audio-chunk', { meetingId, chunk, mimeType });
}

export function joinTeam(teamId: string): void {
  socket?.emit('team:join', { teamId });
}

export function leaveTeam(teamId: string): void {
  socket?.emit('team:leave', { teamId });
}

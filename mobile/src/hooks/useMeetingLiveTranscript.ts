import { useEffect, useState } from 'react';
import { getSocket, joinMeeting, leaveMeeting } from '../services/socket';

interface PartialTranscriptEvent {
  meetingId: string;
  text: string;
  at: string;
}

interface AttendanceEvent {
  meetingId: string;
  userId: string;
}

/** Joins the meeting's Socket.IO room, accumulates live partial transcript chunks, and tracks who's present. */
export function useMeetingLiveTranscript(meetingId: string, active: boolean) {
  const [liveTranscript, setLiveTranscript] = useState('');
  const [presentUserIds, setPresentUserIds] = useState<string[]>([]);

  useEffect(() => {
    if (!active) return;
    const socket = getSocket();
    if (!socket) return;

    joinMeeting(meetingId);

    const onPartial = (event: PartialTranscriptEvent) => {
      if (event.meetingId !== meetingId) return;
      setLiveTranscript((prev) => `${prev} ${event.text}`.trim());
    };
    const onJoined = (event: AttendanceEvent) => {
      if (event.meetingId !== meetingId) return;
      setPresentUserIds((prev) => (prev.includes(event.userId) ? prev : [...prev, event.userId]));
    };
    const onLeft = (event: AttendanceEvent) => {
      if (event.meetingId !== meetingId) return;
      setPresentUserIds((prev) => prev.filter((id) => id !== event.userId));
    };

    socket.on('meeting:transcript-partial', onPartial);
    socket.on('meeting:attendance:joined', onJoined);
    socket.on('meeting:attendance:left', onLeft);

    return () => {
      leaveMeeting(meetingId);
      socket.off('meeting:transcript-partial', onPartial);
      socket.off('meeting:attendance:joined', onJoined);
      socket.off('meeting:attendance:left', onLeft);
    };
  }, [meetingId, active]);

  return { liveTranscript, presentUserIds };
}

import { useEffect } from 'react';
import { getSocket, joinTeam, leaveTeam } from '../services/socket';
import { tasksApi } from '../api/tasksApi';
import { useAppDispatch } from '../store/hooks';

/** Joins the team's Kanban room and refetches the board whenever another client changes a task. */
export function useTaskBoardSocket(teamId: string) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    joinTeam(teamId);

    const invalidate = () => {
      dispatch(tasksApi.util.invalidateTags([{ type: 'Task', id: `BOARD-${teamId}` }]));
    };

    socket.on('task:created', invalidate);
    socket.on('task:updated', invalidate);
    socket.on('task:moved', invalidate);
    socket.on('task:deleted', invalidate);
    socket.on('task:commented', invalidate);

    return () => {
      leaveTeam(teamId);
      socket.off('task:created', invalidate);
      socket.off('task:updated', invalidate);
      socket.off('task:moved', invalidate);
      socket.off('task:deleted', invalidate);
      socket.off('task:commented', invalidate);
    };
  }, [teamId, dispatch]);
}

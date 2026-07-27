import { useEffect } from 'react';
import { getSocket } from '../services/socket';
import { notificationsApi } from '../api/notificationsApi';
import { useAppDispatch } from '../store/hooks';

/** Global listener: whenever the server pushes a new notification, refresh the notifications list/badge. */
export function useNotificationSocket(enabled: boolean) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!enabled) return;
    const socket = getSocket();
    if (!socket) return;

    const onNotification = () => {
      dispatch(notificationsApi.util.invalidateTags([{ type: 'Notification', id: 'LIST' }]));
    };

    socket.on('notification:new', onNotification);
    return () => {
      socket.off('notification:new', onNotification);
    };
  }, [enabled, dispatch]);
}

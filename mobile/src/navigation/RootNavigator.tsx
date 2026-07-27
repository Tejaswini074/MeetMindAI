import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { LoadingSpinner } from '../components';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { bootstrapAuth, setUser } from '../features/auth/authSlice';
import { useGetMeQuery } from '../api/usersApi';
import { connectSocket, disconnectSocket } from '../services/socket';
import { useNotificationSocket } from '../hooks/useNotificationSocket';

export function RootNavigator() {
  const dispatch = useAppDispatch();
  const { accessToken, bootstrapped, user } = useAppSelector((s) => s.auth);

  useEffect(() => {
    dispatch(bootstrapAuth());
  }, [dispatch]);

  useEffect(() => {
    if (accessToken) {
      connectSocket(accessToken);
    } else {
      disconnectSocket();
    }
  }, [accessToken]);

  const { data: me } = useGetMeQuery(undefined, { skip: !accessToken });

  useEffect(() => {
    if (me) dispatch(setUser(me));
  }, [me, dispatch]);

  useNotificationSocket(!!accessToken);

  // While we have a token but haven't resolved the profile yet (cold start, or a
  // refresh-in-flight), show a spinner rather than flashing the login screen.
  if (!bootstrapped || (accessToken && !user)) {
    return <LoadingSpinner />;
  }

  const isAuthenticated = !!accessToken && !!user;

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainTabNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

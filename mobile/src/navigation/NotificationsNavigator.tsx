import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NotificationsListScreen } from '../screens/notifications/NotificationsListScreen';
import type { NotificationsStackParamList } from './types';

const Stack = createNativeStackNavigator<NotificationsStackParamList>();

export function NotificationsNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="NotificationsList" component={NotificationsListScreen} />
    </Stack.Navigator>
  );
}

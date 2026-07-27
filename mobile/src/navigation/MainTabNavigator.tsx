import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MeetingsNavigator } from './MeetingsNavigator';
import { TasksNavigator } from './TasksNavigator';
import { TeamsNavigator } from './TeamsNavigator';
import { NotificationsNavigator } from './NotificationsNavigator';
import { ProfileNavigator } from './ProfileNavigator';
import { colors } from '../theme';
import { useListNotificationsQuery } from '../api/notificationsApi';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabNavigator() {
  const { data } = useListNotificationsQuery(undefined, { pollingInterval: 60000 });
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen name="MeetingsTab" component={MeetingsNavigator} options={{ title: 'Meetings' }} />
      <Tab.Screen name="TasksTab" component={TasksNavigator} options={{ title: 'Tasks' }} />
      <Tab.Screen name="TeamsTab" component={TeamsNavigator} options={{ title: 'Teams' }} />
      <Tab.Screen
        name="NotificationsTab"
        component={NotificationsNavigator}
        options={{ title: 'Alerts', tabBarBadge: unreadCount > 0 ? unreadCount : undefined }}
      />
      <Tab.Screen name="ProfileTab" component={ProfileNavigator} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

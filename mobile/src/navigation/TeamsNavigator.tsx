import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TeamsListScreen } from '../screens/teams/TeamsListScreen';
import { TeamDetailScreen } from '../screens/teams/TeamDetailScreen';
import { colors } from '../theme';
import type { TeamsStackParamList } from './types';

const Stack = createNativeStackNavigator<TeamsStackParamList>();

export function TeamsNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerTintColor: colors.primary }}>
      <Stack.Screen name="TeamsList" component={TeamsListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="TeamDetail" component={TeamDetailScreen} options={{ title: 'Team' }} />
    </Stack.Navigator>
  );
}

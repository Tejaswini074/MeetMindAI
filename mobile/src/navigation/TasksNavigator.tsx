import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TeamPickerScreen } from '../screens/tasks/TeamPickerScreen';
import { TaskBoardScreen } from '../screens/tasks/TaskBoardScreen';
import { TaskDetailScreen } from '../screens/tasks/TaskDetailScreen';
import { colors } from '../theme';
import type { TasksStackParamList } from './types';

const Stack = createNativeStackNavigator<TasksStackParamList>();

export function TasksNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerTintColor: colors.primary }}>
      <Stack.Screen name="TeamPicker" component={TeamPickerScreen} options={{ headerShown: false }} />
      <Stack.Screen name="TaskBoard" component={TaskBoardScreen} />
      <Stack.Screen name="TaskDetail" component={TaskDetailScreen} options={{ title: 'Task' }} />
    </Stack.Navigator>
  );
}

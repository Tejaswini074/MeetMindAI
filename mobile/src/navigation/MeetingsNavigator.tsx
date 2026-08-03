import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MeetingsListScreen } from '../screens/meetings/MeetingsListScreen';
import { CreateMeetingScreen } from '../screens/meetings/CreateMeetingScreen';
import { MeetingDetailScreen } from '../screens/meetings/MeetingDetailScreen';
import { AskAssistantScreen } from '../screens/meetings/AskAssistantScreen';
import { SearchScreen } from '../screens/meetings/SearchScreen';
import { colors } from '../theme';
import type { MeetingsStackParamList } from './types';

const Stack = createNativeStackNavigator<MeetingsStackParamList>();

export function MeetingsNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerTintColor: colors.primary }}>
      <Stack.Screen name="MeetingsList" component={MeetingsListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CreateMeeting" component={CreateMeetingScreen} options={{ title: 'New meeting' }} />
      <Stack.Screen name="MeetingDetail" component={MeetingDetailScreen} options={{ title: 'Meeting' }} />
      <Stack.Screen name="AskAssistant" component={AskAssistantScreen} options={{ title: 'Ask AI', headerShown: false }} />
      <Stack.Screen name="Search" component={SearchScreen} options={{ title: 'Search' }} />
    </Stack.Navigator>
  );
}

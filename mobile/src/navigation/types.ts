export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type TeamsStackParamList = {
  TeamsList: undefined;
  TeamDetail: { teamId: string };
};

export type MeetingsStackParamList = {
  MeetingsList: undefined;
  CreateMeeting: { teamId?: string } | undefined;
  MeetingDetail: { meetingId: string };
  AskAssistant: undefined;
};

export type TasksStackParamList = {
  TeamPicker: undefined;
  TaskBoard: { teamId: string; teamName: string };
  TaskDetail: { taskId: string };
};

export type NotificationsStackParamList = {
  NotificationsList: undefined;
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
};

export type MainTabParamList = {
  MeetingsTab: undefined;
  TasksTab: undefined;
  TeamsTab: undefined;
  NotificationsTab: undefined;
  ProfileTab: undefined;
};

import { colors } from '../theme';
import { AiFeature, MeetingStatus, TaskPriority, TaskStatus } from '../types/api';

export const taskStatusLabels: Record<TaskStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
};

export const taskStatusOrder: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

export const priorityLabels: Record<TaskPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

export const meetingStatusLabels: Record<MeetingStatus, string> = {
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export function priorityColor(priority: TaskPriority): string {
  return colors.priority[priority];
}

export function taskStatusColor(status: TaskStatus): string {
  return colors.taskStatus[status];
}

export function meetingStatusColor(status: MeetingStatus): string {
  return colors.meetingStatus[status];
}

export const aiFeatureLabels: Record<AiFeature, string> = {
  TRANSCRIPTION: 'Transcription',
  SUMMARY: 'Summaries',
  ACTION_ITEMS: 'Action items',
  EMBEDDING: 'Search indexing',
  QA: 'AI assistant Q&A',
  SENTIMENT: 'Sentiment analysis',
};

import { baseApi } from './baseApi';
import { AiFeature, ApiEnvelope, MeetingStatus, TaskPriority, TaskStatus } from '../types/api';

export interface DashboardAnalytics {
  totalMeetings: number;
  meetingsThisMonth: number;
  upcomingMeetings: number;
  totalTasks: number;
  taskCompletionRate: number;
  tasksByStatus: { status: TaskStatus; count: number }[];
  totalActionItems: number;
  aiUsageByFeature: { feature: AiFeature; count: number }[];
}

export interface MeetingsAnalytics {
  totalInRange: number;
  averageDurationMinutes: number;
  averageSentiment: number | null;
  countByWeek: { week: string; count: number }[];
  byStatus: { status: MeetingStatus; count: number }[];
}

export interface TasksAnalytics {
  byStatus: { status: TaskStatus; count: number }[];
  byPriority: { priority: TaskPriority; count: number }[];
  overdueCount: number;
  byAssignee: { assigneeId: string | null; assigneeName: string; count: number }[];
}

export interface AiUsageAnalytics {
  totalTokensUsed: number;
  byFeature: { feature: AiFeature; count: number; tokensUsed: number }[];
}

export const analyticsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardAnalytics: builder.query<DashboardAnalytics, { teamId?: string } | void>({
      query: (params) => ({ url: '/analytics/dashboard', params: params ?? undefined }),
      transformResponse: (response: ApiEnvelope<DashboardAnalytics>) => response.data,
    }),
    getMeetingsAnalytics: builder.query<MeetingsAnalytics, { teamId?: string } | void>({
      query: (params) => ({ url: '/analytics/meetings', params: params ?? undefined }),
      transformResponse: (response: ApiEnvelope<MeetingsAnalytics>) => response.data,
    }),
    getTasksAnalytics: builder.query<TasksAnalytics, { teamId?: string } | void>({
      query: (params) => ({ url: '/analytics/tasks', params: params ?? undefined }),
      transformResponse: (response: ApiEnvelope<TasksAnalytics>) => response.data,
    }),
    getAiUsageAnalytics: builder.query<AiUsageAnalytics, { teamId?: string } | void>({
      query: (params) => ({ url: '/analytics/ai-usage', params: params ?? undefined }),
      transformResponse: (response: ApiEnvelope<AiUsageAnalytics>) => response.data,
    }),
  }),
});

export const {
  useGetDashboardAnalyticsQuery,
  useGetMeetingsAnalyticsQuery,
  useGetTasksAnalyticsQuery,
  useGetAiUsageAnalyticsQuery,
} = analyticsApi;

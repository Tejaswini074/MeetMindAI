import { baseApi } from './baseApi';
import { ActionItem, AiQaResult, ApiEnvelope, Meeting, Summary } from '../types/api';

export const aiApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    summarizeMeeting: builder.mutation<Summary, string>({
      query: (meetingId) => ({ url: `/meetings/${meetingId}/summarize`, method: 'POST' }),
      transformResponse: (response: ApiEnvelope<Summary>) => response.data,
      invalidatesTags: (_result, _error, meetingId) => [{ type: 'Meeting', id: meetingId }],
    }),
    extractActionItems: builder.mutation<ActionItem[], string>({
      query: (meetingId) => ({ url: `/meetings/${meetingId}/action-items`, method: 'POST' }),
      transformResponse: (response: ApiEnvelope<ActionItem[]>) => response.data,
      invalidatesTags: (_result, _error, meetingId) => [
        { type: 'Meeting', id: meetingId },
        { type: 'Task', id: 'LIST' },
      ],
    }),
    analyzeSentiment: builder.mutation<Pick<Meeting, 'sentimentLabel' | 'sentimentScore'>, string>({
      query: (meetingId) => ({ url: `/meetings/${meetingId}/sentiment`, method: 'POST' }),
      transformResponse: (response: ApiEnvelope<Pick<Meeting, 'sentimentLabel' | 'sentimentScore'>>) =>
        response.data,
      invalidatesTags: (_result, _error, meetingId) => [{ type: 'Meeting', id: meetingId }],
    }),
    askAboutMeeting: builder.mutation<AiQaResult, { meetingId: string; question: string }>({
      query: ({ meetingId, question }) => ({ url: `/meetings/${meetingId}/qa`, method: 'POST', body: { question } }),
      transformResponse: (response: ApiEnvelope<AiQaResult>) => response.data,
    }),
    askAssistant: builder.mutation<AiQaResult, string>({
      query: (question) => ({ url: '/ai/qa', method: 'POST', body: { question } }),
      transformResponse: (response: ApiEnvelope<AiQaResult>) => response.data,
    }),
  }),
});

export const {
  useSummarizeMeetingMutation,
  useExtractActionItemsMutation,
  useAnalyzeSentimentMutation,
  useAskAboutMeetingMutation,
  useAskAssistantMutation,
} = aiApi;

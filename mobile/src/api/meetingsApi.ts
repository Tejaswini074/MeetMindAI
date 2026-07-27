import { baseApi } from './baseApi';
import {
  ApiEnvelope,
  AttendanceRecord,
  Meeting,
  MeetingAudio,
  MeetingParticipant,
  MeetingStatus,
  ParticipantRole,
  RsvpStatus,
  Transcript,
} from '../types/api';

interface CreateMeetingInput {
  teamId: string;
  title: string;
  description?: string;
  scheduledAt: string;
  durationMinutes?: number;
  recurrenceRule?: string;
  participantIds?: string[];
}

interface FilePickerAsset {
  uri: string;
  name: string;
  mimeType: string;
}

export const meetingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listMeetings: builder.query<Meeting[], { teamId?: string; status?: MeetingStatus } | void>({
      query: (params) => ({ url: '/meetings', params: params ?? undefined }),
      transformResponse: (response: ApiEnvelope<Meeting[]>) => response.data,
      providesTags: (result) =>
        result
          ? [...result.map((m) => ({ type: 'Meeting' as const, id: m.id })), { type: 'Meeting' as const, id: 'LIST' }]
          : [{ type: 'Meeting' as const, id: 'LIST' }],
    }),
    getMeeting: builder.query<Meeting, string>({
      query: (id) => `/meetings/${id}`,
      transformResponse: (response: ApiEnvelope<Meeting>) => response.data,
      providesTags: (_result, _error, id) => [{ type: 'Meeting', id }],
    }),
    createMeeting: builder.mutation<Meeting, CreateMeetingInput>({
      query: (body) => ({ url: '/meetings', method: 'POST', body }),
      transformResponse: (response: ApiEnvelope<Meeting>) => response.data,
      invalidatesTags: [{ type: 'Meeting', id: 'LIST' }],
    }),
    updateMeeting: builder.mutation<Meeting, { id: string } & Partial<CreateMeetingInput> & { status?: MeetingStatus }>({
      query: ({ id, ...body }) => ({ url: `/meetings/${id}`, method: 'PATCH', body }),
      transformResponse: (response: ApiEnvelope<Meeting>) => response.data,
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Meeting', id }],
    }),
    deleteMeeting: builder.mutation<void, string>({
      query: (id) => ({ url: `/meetings/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Meeting', id: 'LIST' }],
    }),
    addParticipants: builder.mutation<
      MeetingParticipant[],
      { meetingId: string; participants: { userId: string; role?: ParticipantRole }[] }
    >({
      query: ({ meetingId, participants }) => ({
        url: `/meetings/${meetingId}/participants`,
        method: 'POST',
        body: { participants },
      }),
      transformResponse: (response: ApiEnvelope<MeetingParticipant[]>) => response.data,
      invalidatesTags: (_result, _error, { meetingId }) => [{ type: 'Meeting', id: meetingId }],
    }),
    updateRsvp: builder.mutation<MeetingParticipant, { meetingId: string; status: RsvpStatus }>({
      query: ({ meetingId, status }) => ({ url: `/meetings/${meetingId}/rsvp`, method: 'PATCH', body: { status } }),
      transformResponse: (response: ApiEnvelope<MeetingParticipant>) => response.data,
      invalidatesTags: (_result, _error, { meetingId }) => [{ type: 'Meeting', id: meetingId }],
    }),
    markAttendance: builder.mutation<AttendanceRecord, { meetingId: string; userId: string }>({
      query: ({ meetingId, userId }) => ({ url: `/meetings/${meetingId}/attendance`, method: 'POST', body: { userId } }),
      transformResponse: (response: ApiEnvelope<AttendanceRecord>) => response.data,
      invalidatesTags: (_result, _error, { meetingId }) => [{ type: 'Meeting', id: meetingId }],
    }),
    uploadAudio: builder.mutation<MeetingAudio, { meetingId: string; file: FilePickerAsset; language?: string }>({
      query: ({ meetingId, file, language }) => {
        const formData = new FormData();
        // React Native's fetch FormData accepts this { uri, name, type } shape for files.
        formData.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
        if (language) formData.append('language', language);
        return { url: `/meetings/${meetingId}/upload-audio`, method: 'POST', body: formData };
      },
      transformResponse: (response: ApiEnvelope<MeetingAudio>) => response.data,
      invalidatesTags: (_result, _error, { meetingId }) => [{ type: 'Meeting', id: meetingId }],
    }),
    uploadTranscript: builder.mutation<Transcript, { meetingId: string; file: FilePickerAsset }>({
      query: ({ meetingId, file }) => {
        const formData = new FormData();
        formData.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
        return { url: `/meetings/${meetingId}/upload-transcript`, method: 'POST', body: formData };
      },
      transformResponse: (response: ApiEnvelope<Transcript>) => response.data,
      invalidatesTags: (_result, _error, { meetingId }) => [{ type: 'Meeting', id: meetingId }],
    }),
  }),
});

export const {
  useListMeetingsQuery,
  useGetMeetingQuery,
  useCreateMeetingMutation,
  useUpdateMeetingMutation,
  useDeleteMeetingMutation,
  useAddParticipantsMutation,
  useUpdateRsvpMutation,
  useMarkAttendanceMutation,
  useUploadAudioMutation,
  useUploadTranscriptMutation,
} = meetingsApi;

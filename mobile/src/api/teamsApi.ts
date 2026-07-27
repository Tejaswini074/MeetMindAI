import { baseApi } from './baseApi';
import { ApiEnvelope, Team, TeamInvitation, TeamMember, TeamMemberRole } from '../types/api';

export const teamsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listTeams: builder.query<Team[], void>({
      query: () => '/teams',
      transformResponse: (response: ApiEnvelope<Team[]>) => response.data,
      providesTags: (result) =>
        result
          ? [...result.map((t) => ({ type: 'Team' as const, id: t.id })), { type: 'Team' as const, id: 'LIST' }]
          : [{ type: 'Team' as const, id: 'LIST' }],
    }),
    getTeam: builder.query<Team, string>({
      query: (id) => `/teams/${id}`,
      transformResponse: (response: ApiEnvelope<Team>) => response.data,
      providesTags: (_result, _error, id) => [{ type: 'Team', id }],
    }),
    createTeam: builder.mutation<Team, { name: string; description?: string }>({
      query: (body) => ({ url: '/teams', method: 'POST', body }),
      transformResponse: (response: ApiEnvelope<Team>) => response.data,
      invalidatesTags: [{ type: 'Team', id: 'LIST' }],
    }),
    listTeamMembers: builder.query<TeamMember[], string>({
      query: (teamId) => `/teams/${teamId}/members`,
      transformResponse: (response: ApiEnvelope<TeamMember[]>) => response.data,
      providesTags: (_result, _error, teamId) => [{ type: 'TeamMember', id: teamId }],
    }),
    inviteTeamMember: builder.mutation<TeamInvitation, { teamId: string; email: string; role?: TeamMemberRole }>({
      query: ({ teamId, ...body }) => ({ url: `/teams/${teamId}/invite`, method: 'POST', body }),
      transformResponse: (response: ApiEnvelope<TeamInvitation>) => response.data,
    }),
    removeTeamMember: builder.mutation<void, { teamId: string; userId: string }>({
      query: ({ teamId, userId }) => ({ url: `/teams/${teamId}/members/${userId}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, { teamId }) => [{ type: 'TeamMember', id: teamId }],
    }),
    acceptInvitation: builder.mutation<Team, string>({
      query: (token) => ({ url: `/teams/invitations/${token}/accept`, method: 'POST' }),
      transformResponse: (response: ApiEnvelope<Team>) => response.data,
      invalidatesTags: [{ type: 'Team', id: 'LIST' }],
    }),
  }),
});

export const {
  useListTeamsQuery,
  useGetTeamQuery,
  useCreateTeamMutation,
  useListTeamMembersQuery,
  useInviteTeamMemberMutation,
  useRemoveTeamMemberMutation,
  useAcceptInvitationMutation,
} = teamsApi;

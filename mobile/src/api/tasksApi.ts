import { baseApi } from './baseApi';
import { ApiEnvelope, Task, TaskComment, TaskAttachment, TaskPriority, TaskStatus } from '../types/api';

interface CreateTaskInput {
  teamId: string;
  meetingId?: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  assigneeId?: string;
  dueDate?: string;
}

export const tasksApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getBoard: builder.query<Task[], string>({
      query: (teamId) => ({ url: '/tasks/board', params: { teamId } }),
      transformResponse: (response: ApiEnvelope<Task[]>) => response.data,
      providesTags: (result, _error, teamId) =>
        result
          ? [...result.map((t) => ({ type: 'Task' as const, id: t.id })), { type: 'Task' as const, id: `BOARD-${teamId}` }]
          : [{ type: 'Task' as const, id: `BOARD-${teamId}` }],
    }),
    getTask: builder.query<Task, string>({
      query: (id) => `/tasks/${id}`,
      transformResponse: (response: ApiEnvelope<Task>) => response.data,
      providesTags: (_result, _error, id) => [{ type: 'Task', id }],
    }),
    createTask: builder.mutation<Task, CreateTaskInput>({
      query: (body) => ({ url: '/tasks', method: 'POST', body }),
      transformResponse: (response: ApiEnvelope<Task>) => response.data,
      invalidatesTags: (_result, _error, { teamId }) => [{ type: 'Task', id: `BOARD-${teamId}` }],
    }),
    updateTask: builder.mutation<Task, { id: string; teamId: string } & Partial<CreateTaskInput>>({
      query: ({ id, teamId: _teamId, ...body }) => ({ url: `/tasks/${id}`, method: 'PATCH', body }),
      transformResponse: (response: ApiEnvelope<Task>) => response.data,
      invalidatesTags: (_result, _error, { id, teamId }) => [{ type: 'Task', id }, { type: 'Task', id: `BOARD-${teamId}` }],
    }),
    moveTask: builder.mutation<Task, { id: string; teamId: string; status: TaskStatus; position?: number }>({
      query: ({ id, status, position }) => ({ url: `/tasks/${id}/move`, method: 'PATCH', body: { status, position: position ?? 0 } }),
      transformResponse: (response: ApiEnvelope<Task>) => response.data,
      invalidatesTags: (_result, _error, { id, teamId }) => [{ type: 'Task', id }, { type: 'Task', id: `BOARD-${teamId}` }],
    }),
    deleteTask: builder.mutation<void, { id: string; teamId: string }>({
      query: ({ id }) => ({ url: `/tasks/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, { teamId }) => [{ type: 'Task', id: `BOARD-${teamId}` }],
    }),
    addTaskComment: builder.mutation<TaskComment, { taskId: string; content: string }>({
      query: ({ taskId, content }) => ({ url: `/tasks/${taskId}/comments`, method: 'POST', body: { content } }),
      transformResponse: (response: ApiEnvelope<TaskComment>) => response.data,
      invalidatesTags: (_result, _error, { taskId }) => [{ type: 'Task', id: taskId }],
    }),
    addTaskAttachment: builder.mutation<TaskAttachment, { taskId: string; file: { uri: string; name: string; mimeType: string } }>({
      query: ({ taskId, file }) => {
        const formData = new FormData();
        formData.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
        return { url: `/tasks/${taskId}/attachments`, method: 'POST', body: formData };
      },
      transformResponse: (response: ApiEnvelope<TaskAttachment>) => response.data,
      invalidatesTags: (_result, _error, { taskId }) => [{ type: 'Task', id: taskId }],
    }),
  }),
});

export const {
  useGetBoardQuery,
  useGetTaskQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useMoveTaskMutation,
  useDeleteTaskMutation,
  useAddTaskCommentMutation,
  useAddTaskAttachmentMutation,
} = tasksApi;

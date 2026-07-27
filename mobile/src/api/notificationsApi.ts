import { baseApi } from './baseApi';
import { ApiEnvelope, Notification, PaginationMeta } from '../types/api';

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listNotifications: builder.query<{ items: Notification[]; unreadCount: number }, void>({
      query: () => '/notifications',
      transformResponse: (response: ApiEnvelope<Notification[]>) => ({
        items: response.data,
        unreadCount: (response.meta as (PaginationMeta & { unreadCount: number }) | undefined)?.unreadCount ?? 0,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map((n) => ({ type: 'Notification' as const, id: n.id })),
              { type: 'Notification' as const, id: 'LIST' },
            ]
          : [{ type: 'Notification' as const, id: 'LIST' }],
    }),
    markNotificationRead: builder.mutation<void, string>({
      query: (id) => ({ url: `/notifications/${id}/read`, method: 'PATCH' }),
      invalidatesTags: [{ type: 'Notification', id: 'LIST' }],
    }),
    markAllNotificationsRead: builder.mutation<void, void>({
      query: () => ({ url: '/notifications/read-all', method: 'PATCH' }),
      invalidatesTags: [{ type: 'Notification', id: 'LIST' }],
    }),
  }),
});

export const { useListNotificationsQuery, useMarkNotificationReadMutation, useMarkAllNotificationsReadMutation } =
  notificationsApi;

import { baseApi } from './baseApi';
import { ApiEnvelope, Notification, PaginationMeta } from '../types/api';

const NOTIFICATIONS_PAGE_SIZE = 20;

interface NotificationsPage {
  items: Notification[];
  total: number;
  unreadCount: number;
}

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listNotifications: builder.query<NotificationsPage, { page?: number } | void>({
      query: (params) => ({ url: '/notifications', params: { ...params, limit: NOTIFICATIONS_PAGE_SIZE } }),
      transformResponse: (response: ApiEnvelope<Notification[]>): NotificationsPage => {
        const meta = response.meta as (PaginationMeta & { unreadCount: number }) | undefined;
        return {
          items: response.data,
          total: meta?.total ?? response.data.length,
          unreadCount: meta?.unreadCount ?? 0,
        };
      },
      serializeQueryArgs: () => 'notifications',
      merge: (currentCache, newData, { arg }) => {
        if (!arg?.page || arg.page === 1) {
          currentCache.items = newData.items;
        } else {
          currentCache.items.push(...newData.items);
        }
        currentCache.total = newData.total;
        currentCache.unreadCount = newData.unreadCount;
      },
      forceRefetch: ({ currentArg, previousArg }) => currentArg?.page !== previousArg?.page,
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

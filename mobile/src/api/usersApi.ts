import { baseApi } from './baseApi';
import { ApiEnvelope, User } from '../types/api';

export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMe: builder.query<User, void>({
      query: () => '/users/me',
      transformResponse: (response: ApiEnvelope<User>) => response.data,
      providesTags: ['User'],
    }),
    updateProfile: builder.mutation<User, Partial<Pick<User, 'name' | 'avatarUrl'>>>({
      query: (body) => ({ url: '/users/me', method: 'PATCH', body }),
      transformResponse: (response: ApiEnvelope<User>) => response.data,
      invalidatesTags: ['User'],
    }),
    registerDeviceToken: builder.mutation<void, { fcmToken: string; platform: 'ios' | 'android' | 'web' }>({
      query: (body) => ({ url: '/users/me/device-token', method: 'POST', body }),
    }),
  }),
});

export const { useGetMeQuery, useUpdateProfileMutation, useRegisterDeviceTokenMutation } = usersApi;

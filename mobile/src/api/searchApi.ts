import { baseApi } from './baseApi';
import { ApiEnvelope, SearchResult } from '../types/api';

interface SearchResponse {
  fulltext?: SearchResult[];
  semantic?: SearchResult[];
}

export const searchApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    search: builder.query<SearchResponse, { q: string; teamId?: string }>({
      query: ({ q, teamId }) => ({ url: '/search', params: { q, type: 'all', teamId } }),
      transformResponse: (response: ApiEnvelope<SearchResponse>) => response.data,
    }),
  }),
});

export const { useSearchQuery, useLazySearchQuery } = searchApi;

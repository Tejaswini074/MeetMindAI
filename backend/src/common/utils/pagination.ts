export interface PaginationQuery {
  page?: string | number;
  limit?: string | number;
  sort?: string;
  order?: string;
}

export interface ParsedPagination {
  page: number;
  limit: number;
  skip: number;
  take: number;
  orderBy: Record<string, 'asc' | 'desc'> | undefined;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export function parsePagination(
  query: PaginationQuery,
  allowedSortFields: string[] = [],
  defaultSortField = 'createdAt',
): ParsedPagination {
  const page = Math.max(DEFAULT_PAGE, Number(query.page) || DEFAULT_PAGE);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(query.limit) || DEFAULT_LIMIT));
  const skip = (page - 1) * limit;

  let sortField = defaultSortField;
  if (query.sort && allowedSortFields.includes(query.sort)) {
    sortField = query.sort;
  }
  const order: 'asc' | 'desc' = query.order === 'asc' ? 'asc' : 'desc';

  return {
    page,
    limit,
    skip,
    take: limit,
    orderBy: sortField ? { [sortField]: order } : undefined,
  };
}

export function buildMeta(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

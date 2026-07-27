import { parsePagination, buildMeta } from '@common/utils/pagination';

describe('parsePagination', () => {
  it('applies defaults when no query params are given', () => {
    const result = parsePagination({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.skip).toBe(0);
    expect(result.take).toBe(20);
    expect(result.orderBy).toEqual({ createdAt: 'desc' });
  });

  it('computes skip/take from page and limit', () => {
    const result = parsePagination({ page: '3', limit: '10' });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(10);
    expect(result.skip).toBe(20);
    expect(result.take).toBe(10);
  });

  it('clamps limit to the maximum allowed', () => {
    const result = parsePagination({ limit: '500' });
    expect(result.limit).toBe(100);
  });

  it('floors page and limit at 1', () => {
    const result = parsePagination({ page: '-5', limit: '0' });
    expect(result.page).toBe(1);
    expect(result.limit).toBe(1);
  });

  it('only honors sort fields on the allow-list', () => {
    const allowed = parsePagination({ sort: 'name' }, ['name', 'email']);
    expect(allowed.orderBy).toEqual({ name: 'desc' });

    const disallowed = parsePagination({ sort: 'passwordHash' }, ['name', 'email']);
    expect(disallowed.orderBy).toEqual({ createdAt: 'desc' });
  });

  it('respects the order direction', () => {
    const result = parsePagination({ sort: 'name', order: 'asc' }, ['name']);
    expect(result.orderBy).toEqual({ name: 'asc' });
  });
});

describe('buildMeta', () => {
  it('computes total pages, rounding up', () => {
    expect(buildMeta(1, 20, 45)).toEqual({ page: 1, limit: 20, total: 45, totalPages: 3 });
  });

  it('always returns at least 1 total page', () => {
    expect(buildMeta(1, 20, 0)).toEqual({ page: 1, limit: 20, total: 0, totalPages: 1 });
  });
});

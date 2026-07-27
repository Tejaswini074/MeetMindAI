import { Request, Response } from 'express';
import { GlobalRole } from '@prisma/client';
import { authenticate, authorize } from '@middlewares/auth.middleware';
import { signAccessToken } from '@common/utils/jwt';
import { AppError } from '@common/errors/AppError';

function mockReq(overrides: Partial<Request> = {}): Request {
  return { headers: {}, ...overrides } as Request;
}

describe('authenticate middleware', () => {
  it('rejects requests with no Authorization header', () => {
    const req = mockReq();
    const next = jest.fn();
    authenticate(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect((next.mock.calls[0][0] as AppError).statusCode).toBe(401);
  });

  it('rejects a malformed Authorization header', () => {
    const req = mockReq({ headers: { authorization: 'Token abc' } });
    const next = jest.fn();
    authenticate(req, {} as Response, next);

    expect((next.mock.calls[0][0] as AppError).statusCode).toBe(401);
  });

  it('attaches req.user for a valid bearer token', () => {
    const token = signAccessToken({ sub: 'user-1', email: 'a@b.com', role: GlobalRole.TEAM_LEAD });
    const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
    const next = jest.fn();

    authenticate(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual({ id: 'user-1', email: 'a@b.com', role: GlobalRole.TEAM_LEAD });
  });

  it('rejects an invalid token', () => {
    const req = mockReq({ headers: { authorization: 'Bearer not-a-real-token' } });
    const next = jest.fn();
    authenticate(req, {} as Response, next);

    expect((next.mock.calls[0][0] as AppError).statusCode).toBe(401);
  });
});

describe('authorize middleware (RBAC)', () => {
  it('calls next() with no error when the user has an allowed role', () => {
    const req = mockReq({ user: { id: 'u1', email: 'a@b.com', role: GlobalRole.ADMIN } });
    const next = jest.fn();

    authorize(GlobalRole.ADMIN, GlobalRole.TEAM_LEAD)(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('forbids a user whose role is not in the allowed list', () => {
    const req = mockReq({ user: { id: 'u1', email: 'a@b.com', role: GlobalRole.TEAM_MEMBER } });
    const next = jest.fn();

    authorize(GlobalRole.ADMIN)(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect((next.mock.calls[0][0] as AppError).statusCode).toBe(403);
  });

  it('rejects when there is no authenticated user at all', () => {
    const req = mockReq();
    const next = jest.fn();

    authorize(GlobalRole.ADMIN)(req, {} as Response, next);

    expect((next.mock.calls[0][0] as AppError).statusCode).toBe(401);
  });
});

import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '@config/prisma';
import { cleanDatabase } from './testUtils';

const app = createApp();

describe('Auth flow (integration)', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  it('registers the first user as ADMIN and issues tokens', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('ADMIN');
    expect(res.body.data.tokens.accessToken).toEqual(expect.any(String));
    expect(res.body.data.tokens.refreshToken).toEqual(expect.any(String));
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('registers a second user as TEAM_MEMBER by default', async () => {
    await request(app).post('/api/auth/register').send({ name: 'First', email: 'first@example.com', password: 'password123' });
    const res = await request(app).post('/api/auth/register').send({ name: 'Second', email: 'second@example.com', password: 'password123' });

    expect(res.body.data.user.role).toBe('TEAM_MEMBER');
  });

  it('rejects duplicate email registration', async () => {
    await request(app).post('/api/auth/register').send({ name: 'Ada', email: 'dup@example.com', password: 'password123' });
    const res = await request(app).post('/api/auth/register').send({ name: 'Ada 2', email: 'dup@example.com', password: 'password123' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('logs in with correct credentials and rejects incorrect ones', async () => {
    await request(app).post('/api/auth/register').send({ name: 'Ada', email: 'login@example.com', password: 'password123' });

    const good = await request(app).post('/api/auth/login').send({ email: 'login@example.com', password: 'password123' });
    expect(good.status).toBe(200);

    const bad = await request(app).post('/api/auth/login').send({ email: 'login@example.com', password: 'wrong-password' });
    expect(bad.status).toBe(401);
  });

  it('refreshes tokens and rotates the refresh token (old one becomes invalid)', async () => {
    const register = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ada', email: 'refresh@example.com', password: 'password123' });
    const { refreshToken } = register.body.data.tokens;

    const refreshed = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.data.refreshToken).not.toBe(refreshToken);

    const reuseOld = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(reuseOld.status).toBe(401);
  });

  it('logs out and invalidates the refresh token', async () => {
    const register = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ada', email: 'logout@example.com', password: 'password123' });
    const { accessToken, refreshToken } = register.body.data.tokens;

    const logout = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken });
    expect(logout.status).toBe(200);

    const refreshed = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(refreshed.status).toBe(401);
  });

  it('rejects requests to protected routes without a token', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
  });
});

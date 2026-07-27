import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '@config/prisma';
import { cleanDatabase } from './testUtils';

const app = createApp();

async function registerAndLogin(email: string) {
  const res = await request(app).post('/api/auth/register').send({ name: 'User', email, password: 'password123' });
  return { userId: res.body.data.user.id as string, accessToken: res.body.data.tokens.accessToken as string };
}

describe('Meetings flow (integration)', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  it('creates a team, schedules a meeting, and lists it back', async () => {
    const owner = await registerAndLogin('owner@example.com');

    const team = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ name: 'Engineering' });
    expect(team.status).toBe(201);

    const meeting = await request(app)
      .post('/api/meetings')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        teamId: team.body.data.id,
        title: 'Sprint Planning',
        scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        durationMinutes: 45,
      });
    expect(meeting.status).toBe(201);
    expect(meeting.body.data.title).toBe('Sprint Planning');

    const list = await request(app)
      .get('/api/meetings')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .query({ teamId: team.body.data.id });
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
  });

  it('prevents a non-member from viewing a team meeting', async () => {
    const owner = await registerAndLogin('owner2@example.com');
    const outsider = await registerAndLogin('outsider@example.com');

    const team = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ name: 'Private Team' });

    const meeting = await request(app)
      .post('/api/meetings')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        teamId: team.body.data.id,
        title: 'Confidential Sync',
        scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });

    const forbidden = await request(app)
      .get(`/api/meetings/${meeting.body.data.id}`)
      .set('Authorization', `Bearer ${outsider.accessToken}`);
    expect(forbidden.status).toBe(403);
  });

  it('accepts an offline transcript upload (TXT) and stores it', async () => {
    const owner = await registerAndLogin('owner3@example.com');

    const team = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ name: 'Ops' });

    const meeting = await request(app)
      .post('/api/meetings')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        teamId: team.body.data.id,
        title: 'Retro',
        scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });

    const upload = await request(app)
      .post(`/api/meetings/${meeting.body.data.id}/upload-transcript`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .attach('file', Buffer.from('Alice: Let us ship the release on Friday.'), {
        filename: 'transcript.txt',
        contentType: 'text/plain',
      });

    expect(upload.status).toBe(201);
    expect(upload.body.data.source).toBe('UPLOAD_TXT');
    expect(upload.body.data.fullText).toContain('ship the release');
  });

  it('only the organizer, a team lead, or an admin can delete a meeting', async () => {
    const owner = await registerAndLogin('owner4@example.com');
    const member = await registerAndLogin('member4@example.com');

    const team = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ name: 'Design' });

    await request(app)
      .post(`/api/teams/${team.body.data.id}/invite`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ email: 'member4@example.com' });

    const invitation = await prisma.teamInvitation.findFirstOrThrow({ where: { teamId: team.body.data.id } });
    await request(app)
      .post(`/api/teams/invitations/${invitation.token}/accept`)
      .set('Authorization', `Bearer ${member.accessToken}`);

    const meeting = await request(app)
      .post('/api/meetings')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        teamId: team.body.data.id,
        title: 'Design Review',
        scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });

    const deniedDelete = await request(app)
      .delete(`/api/meetings/${meeting.body.data.id}`)
      .set('Authorization', `Bearer ${member.accessToken}`);
    expect(deniedDelete.status).toBe(403);

    const allowedDelete = await request(app)
      .delete(`/api/meetings/${meeting.body.data.id}`)
      .set('Authorization', `Bearer ${owner.accessToken}`);
    expect(allowedDelete.status).toBe(200);
  });
});

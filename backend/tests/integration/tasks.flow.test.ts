import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '@config/prisma';
import { cleanDatabase } from './testUtils';

const app = createApp();

async function registerAndLogin(email: string) {
  const res = await request(app).post('/api/auth/register').send({ name: 'User', email, password: 'password123' });
  return { userId: res.body.data.user.id as string, accessToken: res.body.data.tokens.accessToken as string };
}

describe('Tasks / Kanban flow (integration)', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  it('creates a task, moves it across the board, and comments on it', async () => {
    const owner = await registerAndLogin('taskowner@example.com');
    const team = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ name: 'Platform' });

    const create = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ teamId: team.body.data.id, title: 'Set up CI pipeline', priority: 'HIGH' });
    expect(create.status).toBe(201);
    expect(create.body.data.status).toBe('TODO');

    const move = await request(app)
      .patch(`/api/tasks/${create.body.data.id}/move`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ status: 'IN_PROGRESS', position: 0 });
    expect(move.status).toBe(200);
    expect(move.body.data.status).toBe('IN_PROGRESS');

    const comment = await request(app)
      .post(`/api/tasks/${create.body.data.id}/comments`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ content: 'Started on this today.' });
    expect(comment.status).toBe(201);
    expect(comment.body.data.content).toBe('Started on this today.');

    const board = await request(app)
      .get('/api/tasks/board')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .query({ teamId: team.body.data.id });
    expect(board.status).toBe(200);
    expect(board.body.data).toHaveLength(1);
    expect(board.body.data[0].status).toBe('IN_PROGRESS');
  });

  it('notifies the assignee when a task is assigned', async () => {
    const owner = await registerAndLogin('assignowner@example.com');
    const member = await registerAndLogin('assignee@example.com');

    const team = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ name: 'Growth' });

    await request(app)
      .post(`/api/teams/${team.body.data.id}/invite`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ email: 'assignee@example.com' });
    const invitation = await prisma.teamInvitation.findFirstOrThrow({ where: { teamId: team.body.data.id } });
    await request(app)
      .post(`/api/teams/invitations/${invitation.token}/accept`)
      .set('Authorization', `Bearer ${member.accessToken}`);

    const task = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ teamId: team.body.data.id, title: 'Write launch copy', assigneeId: member.userId });
    expect(task.status).toBe(201);

    const notifications = await prisma.notification.findMany({ where: { userId: member.userId } });
    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe('TASK_ASSIGNED');
  });

  it('only a team member can create tasks for that team', async () => {
    const owner = await registerAndLogin('teamx@example.com');
    const outsider = await registerAndLogin('outsiderx@example.com');

    const team = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ name: 'Locked Team' });

    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${outsider.accessToken}`)
      .send({ teamId: team.body.data.id, title: 'Should fail' });

    expect(res.status).toBe(403);
  });
});

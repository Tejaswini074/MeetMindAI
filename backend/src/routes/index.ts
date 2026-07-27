import { Router } from 'express';
import authRoutes from '@modules/auth/auth.routes';
import userRoutes from '@modules/users/user.routes';
import teamRoutes from '@modules/teams/team.routes';
import meetingRoutes from '@modules/meetings/meeting.routes';
import taskRoutes from '@modules/tasks/task.routes';
import searchRoutes from '@modules/search/search.routes';
import notificationRoutes from '@modules/notifications/notification.routes';
import analyticsRoutes from '@modules/analytics/analytics.routes';
import auditRoutes from '@modules/audit/audit.routes';
import calendarRoutes from '@modules/calendar/calendar.routes';
import aiRoutes from '@modules/ai/ai.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/teams', teamRoutes);
router.use('/meetings', meetingRoutes);
router.use('/tasks', taskRoutes);
router.use('/search', searchRoutes);
router.use('/notifications', notificationRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/calendar', calendarRoutes);
router.use('/ai', aiRoutes);

export default router;

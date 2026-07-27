import { Router } from 'express';
import { authenticate } from '@middlewares/auth.middleware';
import { validate } from '@middlewares/validate.middleware';
import { dashboard, meetingsAnalytics, tasksAnalytics, aiUsageAnalytics } from '@modules/analytics/analytics.controller';
import { analyticsQuerySchema } from '@modules/analytics/analytics.dto';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /analytics/dashboard:
 *   get:
 *     summary: Overview dashboard (meeting counts, task completion, AI usage)
 *     tags: [Analytics]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */
router.get('/dashboard', validate(analyticsQuerySchema), dashboard);
router.get('/meetings', validate(analyticsQuerySchema), meetingsAnalytics);
router.get('/tasks', validate(analyticsQuerySchema), tasksAnalytics);
router.get('/ai-usage', validate(analyticsQuerySchema), aiUsageAnalytics);

export default router;

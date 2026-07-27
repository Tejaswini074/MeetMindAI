import { Router } from 'express';
import { GlobalRole } from '@prisma/client';
import { authenticate, authorize } from '@middlewares/auth.middleware';
import { validate } from '@middlewares/validate.middleware';
import { listLogs } from '@modules/audit/audit.controller';
import { listAuditLogsSchema } from '@modules/audit/audit.dto';

const router = Router();

/**
 * @openapi
 * /audit-logs:
 *   get:
 *     summary: List audit logs (admin only)
 *     tags: [Audit]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */
router.get('/', authenticate, authorize(GlobalRole.ADMIN), validate(listAuditLogsSchema), listLogs);

export default router;

import { Router } from 'express';
import { authenticate } from '@middlewares/auth.middleware';
import { validate } from '@middlewares/validate.middleware';
import { askAssistant } from '@modules/ai/ai.controller';
import { assistantQaSchema } from '@modules/ai/ai.dto';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /ai/qa:
 *   post:
 *     summary: Ask the AI assistant a question across all of your accessible past meetings (RAG)
 *     tags: [AI]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */
router.post('/qa', validate(assistantQaSchema), askAssistant);

export default router;

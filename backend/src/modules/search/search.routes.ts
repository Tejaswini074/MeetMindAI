import { Router } from 'express';
import { authenticate } from '@middlewares/auth.middleware';
import { validate } from '@middlewares/validate.middleware';
import { search } from '@modules/search/search.controller';
import { searchSchema } from '@modules/search/search.dto';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /search:
 *   get:
 *     summary: Full-text and/or semantic search across meetings, transcripts, summaries, and tasks
 *     tags: [Search]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [fulltext, semantic, all] }
 *       - in: query
 *         name: teamId
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 */
router.get('/', validate(searchSchema), search);

export default router;

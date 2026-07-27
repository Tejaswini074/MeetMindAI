import { Request, Response } from 'express';
import { GlobalRole } from '@prisma/client';
import { asyncHandler } from '@common/utils/asyncHandler';
import { sendSuccess } from '@common/utils/response';
import { AppError } from '@common/errors/AppError';
import { fulltextSearch, semanticSearch } from '@modules/search/search.service';

export const search = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const { q, type, teamId } = req.query as { q: string; type: 'fulltext' | 'semantic' | 'all'; teamId?: string };
  const isAdmin = req.user.role === GlobalRole.ADMIN;

  if (type === 'fulltext') {
    const results = await fulltextSearch(req.user.id, isAdmin, q, teamId);
    sendSuccess(res, { fulltext: results });
    return;
  }

  if (type === 'semantic') {
    const results = await semanticSearch(req.user.id, isAdmin, q, teamId);
    sendSuccess(res, { semantic: results });
    return;
  }

  const [fulltext, semantic] = await Promise.all([
    fulltextSearch(req.user.id, isAdmin, q, teamId),
    semanticSearch(req.user.id, isAdmin, q, teamId),
  ]);
  sendSuccess(res, { fulltext, semantic });
});

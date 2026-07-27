import { Request, Response } from 'express';
import { asyncHandler } from '@common/utils/asyncHandler';
import { sendSuccess } from '@common/utils/response';
import { parsePagination, buildMeta } from '@common/utils/pagination';
import { listAuditLogs } from '@modules/audit/audit.service';

export const listLogs = asyncHandler(async (req: Request, res: Response) => {
  const pagination = parsePagination(req.query as Record<string, string>);
  const { items, total } = await listAuditLogs({
    skip: pagination.skip,
    take: pagination.take,
    action: req.query.action as never,
    entityType: req.query.entityType as string | undefined,
    actorId: req.query.actorId as string | undefined,
  });
  sendSuccess(res, items, 200, buildMeta(pagination.page, pagination.limit, total));
});

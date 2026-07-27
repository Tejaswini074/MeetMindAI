import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from '@common/errors/AppError';
import { sendError } from '@common/utils/response';
import { logger } from '@common/utils/logger';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(AppError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    sendError(res, 'Validation failed', 422, err.flatten());
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      sendError(res, 'A record with this value already exists', 409, { fields: err.meta?.target });
      return;
    }
    if (err.code === 'P2025') {
      sendError(res, 'Record not found', 404);
      return;
    }
    logger.error('Prisma error', { code: err.code, meta: err.meta });
    sendError(res, 'Database error', 400);
    return;
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(err.message, { stack: err.stack, details: err.details });
    }
    sendError(res, err.message, err.statusCode, err.details);
    return;
  }

  const error = err as Error;
  logger.error(error?.message ?? 'Unknown error', { stack: error?.stack });
  sendError(res, 'Internal server error', 500);
}

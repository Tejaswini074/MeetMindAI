import { NextFunction, Request, Response } from 'express';
import { GlobalRole } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { AppError } from '@common/errors/AppError';
import { verifyAccessToken } from '@common/utils/jwt';

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(AppError.unauthorized('Missing or malformed Authorization header'));
    return;
  }

  const token = header.slice('Bearer '.length);

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      next(AppError.unauthorized('Access token expired'));
      return;
    }
    next(AppError.unauthorized('Invalid access token'));
  }
}

export function authorize(...allowedRoles: GlobalRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(AppError.unauthorized());
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      next(AppError.forbidden('You do not have permission to perform this action'));
      return;
    }
    next();
  };
}

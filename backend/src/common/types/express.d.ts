import { GlobalRole } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: GlobalRole;
      };
    }
  }
}

export {};

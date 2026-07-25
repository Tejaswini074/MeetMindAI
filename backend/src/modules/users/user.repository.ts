import { GlobalRole, Prisma, User } from '@prisma/client';
import { prisma } from '@config/prisma';

export class UserRepository {
  findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  create(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({ data });
  }

  update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({ where: { id }, data });
  }

  async list(params: {
    skip: number;
    take: number;
    orderBy?: Record<string, 'asc' | 'desc'>;
    role?: GlobalRole;
    search?: string;
  }): Promise<{ items: User[]; total: number }> {
    const where: Prisma.UserWhereInput = {
      ...(params.role ? { role: params.role } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search } },
              { email: { contains: params.search } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.user.findMany({ where, skip: params.skip, take: params.take, orderBy: params.orderBy }),
      prisma.user.count({ where }),
    ]);

    return { items, total };
  }
}

export const userRepository = new UserRepository();

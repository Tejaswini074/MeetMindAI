import { GlobalRole, User } from '@prisma/client';
import { prisma } from '@config/prisma';
import { AppError } from '@common/errors/AppError';
import { buildMeta, parsePagination, PaginationQuery } from '@common/utils/pagination';
import { userRepository } from '@modules/users/user.repository';
import { UpdateProfileInput, RegisterDeviceTokenInput } from '@modules/users/user.dto';

export type SafeUser = Omit<User, 'passwordHash'>;

export function toSafeUser(user: User): SafeUser {
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}

export class UserService {
  async getById(id: string): Promise<SafeUser> {
    const user = await userRepository.findById(id);
    if (!user) throw AppError.notFound('User not found');
    return toSafeUser(user);
  }

  async updateProfile(id: string, input: UpdateProfileInput): Promise<SafeUser> {
    const user = await userRepository.update(id, input);
    return toSafeUser(user);
  }

  async list(query: PaginationQuery & { role?: GlobalRole; search?: string }) {
    const pagination = parsePagination(query, ['name', 'email', 'createdAt']);
    const { items, total } = await userRepository.list({
      skip: pagination.skip,
      take: pagination.take,
      orderBy: pagination.orderBy,
      role: query.role,
      search: query.search,
    });
    return {
      items: items.map(toSafeUser),
      meta: buildMeta(pagination.page, pagination.limit, total),
    };
  }

  async registerDeviceToken(userId: string, input: RegisterDeviceTokenInput): Promise<void> {
    await prisma.deviceToken.upsert({
      where: { fcmToken: input.fcmToken },
      update: { userId, platform: input.platform },
      create: { userId, fcmToken: input.fcmToken, platform: input.platform },
    });
  }
}

export const userService = new UserService();

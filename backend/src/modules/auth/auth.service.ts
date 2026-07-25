import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import ms from 'ms';
import { AuditAction, GlobalRole } from '@prisma/client';
import { AppError } from '@common/errors/AppError';
import { env } from '@config/env';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '@common/utils/jwt';
import { userRepository } from '@modules/users/user.repository';
import { authRepository } from '@modules/auth/auth.repository';
import { toSafeUser, SafeUser } from '@modules/users/user.service';
import { recordAudit } from '@modules/audit/audit.service';
import { RegisterInput, LoginInput } from '@modules/auth/auth.dto';

const SALT_ROUNDS = 12;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function refreshExpiryDate(): Date {
  const expiresInMs =
    typeof env.JWT_REFRESH_EXPIRES_IN === 'string'
      ? (ms(env.JWT_REFRESH_EXPIRES_IN as ms.StringValue) as number)
      : env.JWT_REFRESH_EXPIRES_IN;
  return new Date(Date.now() + expiresInMs);
}

export class AuthService {
  async register(input: RegisterInput, ipAddress?: string): Promise<{ user: SafeUser; tokens: AuthTokens }> {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw AppError.conflict('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

    // First user in the system becomes ADMIN; everyone else starts as TEAM_MEMBER.
    const userCount = await userRepository.list({ skip: 0, take: 1 });
    const role: GlobalRole = userCount.total === 0 ? GlobalRole.ADMIN : GlobalRole.TEAM_MEMBER;

    const user = await userRepository.create({
      name: input.name,
      email: input.email,
      passwordHash,
      role,
    });

    const tokens = await this.issueTokens(user.id, user.email, user.role);

    await recordAudit({
      actorId: user.id,
      action: AuditAction.CREATE,
      entityType: 'User',
      entityId: user.id,
      ipAddress,
    });

    return { user: toSafeUser(user), tokens };
  }

  async login(input: LoginInput, ipAddress?: string): Promise<{ user: SafeUser; tokens: AuthTokens }> {
    const user = await userRepository.findByEmail(input.email);
    if (!user || !user.isActive) {
      throw AppError.unauthorized('Invalid email or password');
    }

    const passwordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordValid) {
      throw AppError.unauthorized('Invalid email or password');
    }

    const tokens = await this.issueTokens(user.id, user.email, user.role);

    await recordAudit({
      actorId: user.id,
      action: AuditAction.LOGIN,
      entityType: 'User',
      entityId: user.id,
      ipAddress,
    });

    return { user: toSafeUser(user), tokens };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw AppError.unauthorized('Invalid or expired refresh token');
    }

    const tokenHash = hashToken(refreshToken);
    const stored = await authRepository.findByHash(tokenHash);

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw AppError.unauthorized('Refresh token is no longer valid');
    }

    const user = await userRepository.findById(payload.sub);
    if (!user || !user.isActive) {
      throw AppError.unauthorized('Account no longer active');
    }

    const tokens = await this.issueTokens(user.id, user.email, user.role);
    const newHash = hashToken(tokens.refreshToken);
    await authRepository.revoke(stored.id, newHash);

    return tokens;
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    const stored = await authRepository.findByHash(tokenHash);
    if (stored && !stored.revokedAt) {
      await authRepository.revoke(stored.id);
    }
  }

  private async issueTokens(userId: string, email: string, role: GlobalRole): Promise<AuthTokens> {
    const accessToken = signAccessToken({ sub: userId, email, role });
    const tokenId = crypto.randomUUID();
    const refreshToken = signRefreshToken({ sub: userId, tokenId });

    await authRepository.createRefreshToken({
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt: refreshExpiryDate(),
    });

    return { accessToken, refreshToken };
  }
}

export const authService = new AuthService();

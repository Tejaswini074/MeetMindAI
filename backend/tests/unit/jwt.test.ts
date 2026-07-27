import { GlobalRole } from '@prisma/client';
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '@common/utils/jwt';

describe('jwt utils', () => {
  it('signs and verifies an access token round-trip', () => {
    const token = signAccessToken({ sub: 'user-1', email: 'a@b.com', role: GlobalRole.TEAM_MEMBER });
    const payload = verifyAccessToken(token);

    expect(payload.sub).toBe('user-1');
    expect(payload.email).toBe('a@b.com');
    expect(payload.role).toBe(GlobalRole.TEAM_MEMBER);
  });

  it('signs and verifies a refresh token round-trip', () => {
    const token = signRefreshToken({ sub: 'user-1', tokenId: 'token-1' });
    const payload = verifyRefreshToken(token);

    expect(payload.sub).toBe('user-1');
    expect(payload.tokenId).toBe('token-1');
  });

  it('rejects an access token verified with the refresh secret', () => {
    const token = signAccessToken({ sub: 'user-1', email: 'a@b.com', role: GlobalRole.ADMIN });
    expect(() => verifyRefreshToken(token)).toThrow();
  });

  it('rejects a tampered token', () => {
    const token = signAccessToken({ sub: 'user-1', email: 'a@b.com', role: GlobalRole.ADMIN });
    const tampered = token.slice(0, -2) + (token.endsWith('a') ? 'bb' : 'aa');
    expect(() => verifyAccessToken(tampered)).toThrow();
  });
});

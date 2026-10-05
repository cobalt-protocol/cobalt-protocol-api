import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  AuthSessionGuard,
  OptionalAuthSessionGuard,
} from './auth-session.guard.js';

describe('AuthSessionGuard', () => {
  let guard: AuthSessionGuard;
  let jwtService: JwtService;

  beforeEach(() => {
    jwtService = {
      verifyAsync: vi.fn(),
    } as unknown as JwtService;
    guard = new AuthSessionGuard(jwtService);
  });

  const createMockContext = (authHeader?: string) => {
    const request = {
      headers: {
        authorization: authHeader,
      },
      userId: undefined as string | undefined,
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      request,
    };
  };

  it('throws UnauthorizedException when Authorization header is missing', async () => {
    const ctx = createMockContext();
    await expect(
      guard.canActivate(ctx as unknown as ExecutionContext),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when Bearer format is invalid', async () => {
    const ctx = createMockContext('InvalidHeader');
    await expect(
      guard.canActivate(ctx as unknown as ExecutionContext),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when JWT verification fails', async () => {
    vi.spyOn(jwtService, 'verifyAsync').mockRejectedValue(
      new Error('Invalid token'),
    );
    const ctx = createMockContext('Bearer invalid-token');
    await expect(
      guard.canActivate(ctx as unknown as ExecutionContext),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('sets userId on request and returns true when JWT is valid', async () => {
    vi.spyOn(jwtService, 'verifyAsync').mockResolvedValue({
      sub: 'user-id-123',
    });
    const mockCtx = createMockContext('Bearer valid-token');
    const result = await guard.canActivate(
      mockCtx as unknown as ExecutionContext,
    );

    expect(result).toBe(true);
    expect(mockCtx.request.userId).toBe('user-id-123');
  });
});

describe('OptionalAuthSessionGuard', () => {
  let guard: OptionalAuthSessionGuard;
  let jwtService: JwtService;

  beforeEach(() => {
    jwtService = {
      verifyAsync: vi.fn(),
    } as unknown as JwtService;
    guard = new OptionalAuthSessionGuard(jwtService);
  });

  const createMockContext = (authHeader?: string) => {
    const request = {
      headers: {
        authorization: authHeader,
      },
      userId: undefined as string | undefined,
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      request,
    };
  };

  it('returns true without setting userId when Authorization header is missing', async () => {
    const mockCtx = createMockContext();
    const result = await guard.canActivate(
      mockCtx as unknown as ExecutionContext,
    );

    expect(result).toBe(true);
    expect(mockCtx.request.userId).toBeUndefined();
  });

  it('returns true without setting userId when JWT verification fails', async () => {
    vi.spyOn(jwtService, 'verifyAsync').mockRejectedValue(
      new Error('Invalid token'),
    );
    const mockCtx = createMockContext('Bearer invalid-token');
    const result = await guard.canActivate(
      mockCtx as unknown as ExecutionContext,
    );

    expect(result).toBe(true);
    expect(mockCtx.request.userId).toBeUndefined();
  });

  it('sets userId on request and returns true when JWT is valid', async () => {
    vi.spyOn(jwtService, 'verifyAsync').mockResolvedValue({
      sub: 'user-id-123',
    });
    const mockCtx = createMockContext('Bearer valid-token');
    const result = await guard.canActivate(
      mockCtx as unknown as ExecutionContext,
    );

    expect(result).toBe(true);
    expect(mockCtx.request.userId).toBe('user-id-123');
  });
});

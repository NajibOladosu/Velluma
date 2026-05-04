import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SupabaseAuthGuard } from '../../src/common/guards/supabase-auth.guard';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function buildContext(
  authHeader: string | undefined,
  isPublic = false,
): ExecutionContext {
  const mockReflector = {
    getAllAndOverride: jest.fn().mockReturnValue(isPublic),
  } as unknown as Reflector;

  const mockRequest = {
    headers: { authorization: authHeader },
    user: undefined,
  };
  const mockHttp = { getRequest: () => mockRequest };
  const ctx = {
    switchToHttp: () => mockHttp,
    getHandler: () => ({}),
    getClass: () => ({}),
    _reflector: mockReflector,
    _request: mockRequest,
  } as unknown as ExecutionContext;

  return ctx;
}

// ──────────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────────

describe('SupabaseAuthGuard', () => {
  let guard: SupabaseAuthGuard;
  let mockSupabaseService: any;
  let mockReflector: Reflector;

  const validUser = { id: 'user-1', email: 'test@example.com' };

  beforeEach(() => {
    mockReflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;

    mockSupabaseService = {
      getClient: jest.fn().mockReturnValue({
        auth: {
          getUser: jest
            .fn()
            .mockResolvedValue({ data: { user: validUser }, error: null }),
        },
      }),
    };

    guard = new SupabaseAuthGuard(mockReflector, mockSupabaseService);
  });

  describe('@Public() decorator', () => {
    it('allows access to routes decorated with @Public()', async () => {
      (mockReflector.getAllAndOverride as jest.Mock).mockReturnValue(true);
      const ctx = buildContext(undefined, true);
      ctx['_reflector'] = mockReflector;

      // Override the reflector on the guard
      (guard as any).reflector = mockReflector;

      const result = await guard.canActivate(ctx);
      expect(result).toBe(true);
    });
  });

  describe('when Authorization header is missing', () => {
    it('throws UnauthorizedException', async () => {
      const mockRequest = { headers: {}, user: undefined };
      const ctx = {
        switchToHttp: () => ({ getRequest: () => mockRequest }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as unknown as ExecutionContext;

      (guard as any).reflector = {
        getAllAndOverride: jest.fn().mockReturnValue(false),
      };

      await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when header does not start with Bearer', async () => {
      const mockRequest = {
        headers: { authorization: 'Basic abc123' },
        user: undefined,
      };
      const ctx = {
        switchToHttp: () => ({ getRequest: () => mockRequest }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as unknown as ExecutionContext;

      (guard as any).reflector = {
        getAllAndOverride: jest.fn().mockReturnValue(false),
      };

      await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('when token is valid', () => {
    it('returns true and attaches user to request', async () => {
      const mockRequest = {
        headers: { authorization: 'Bearer valid-token' },
        user: undefined,
      };
      const ctx = {
        switchToHttp: () => ({ getRequest: () => mockRequest }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as unknown as ExecutionContext;

      (guard as any).reflector = {
        getAllAndOverride: jest.fn().mockReturnValue(false),
      };

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(mockRequest.user).toEqual(validUser);
      expect(mockSupabaseService.getClient().auth.getUser).toHaveBeenCalledWith(
        'valid-token',
      );
    });
  });

  describe('when token is invalid', () => {
    it('throws UnauthorizedException when Supabase returns an error', async () => {
      mockSupabaseService.getClient.mockReturnValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'JWT expired' },
          }),
        },
      });

      const mockRequest = {
        headers: { authorization: 'Bearer expired-token' },
        user: undefined,
      };
      const ctx = {
        switchToHttp: () => ({ getRequest: () => mockRequest }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as unknown as ExecutionContext;

      (guard as any).reflector = {
        getAllAndOverride: jest.fn().mockReturnValue(false),
      };

      await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when user is null', async () => {
      mockSupabaseService.getClient.mockReturnValue({
        auth: {
          getUser: jest
            .fn()
            .mockResolvedValue({ data: { user: null }, error: null }),
        },
      });

      const mockRequest = {
        headers: { authorization: 'Bearer token' },
        user: undefined,
      };
      const ctx = {
        switchToHttp: () => ({ getRequest: () => mockRequest }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as unknown as ExecutionContext;

      (guard as any).reflector = {
        getAllAndOverride: jest.fn().mockReturnValue(false),
      };

      await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });
});

import { AppThrottlerGuard } from './throttler.guard';

/**
 * Tests for the custom tracker key logic.
 *
 * AppThrottlerGuard overrides `getTracker` to key on user ID when an
 * authenticated user is present, falling back to IP for public/anonymous
 * requests. We test the tracker directly via the protected method.
 */

// Minimal stub — ThrottlerGuard constructor requires ThrottlerStorageService
// and Reflector injected. We bypass NestJS DI by casting and calling
// getTracker directly.
function makeGuard() {
  const guard = Object.create(AppThrottlerGuard.prototype) as AppThrottlerGuard;
  return guard;
}

describe('AppThrottlerGuard.getTracker', () => {
  it('returns user:{id} when req.user.id is set', async () => {
    const guard = makeGuard();
    const req = { user: { id: 'user-uuid-123' }, headers: {}, ip: '1.2.3.4' };

    const tracker = await (guard as unknown as { getTracker(r: unknown): Promise<string> }).getTracker(req);

    expect(tracker).toBe('user:user-uuid-123');
  });

  it('returns ip:{addr} from X-Forwarded-For when no user is authenticated', async () => {
    const guard = makeGuard();
    const req = {
      user: undefined,
      headers: { 'x-forwarded-for': '203.0.113.5, 10.0.0.1' },
      ip: '10.0.0.1',
    };

    const tracker = await (guard as unknown as { getTracker(r: unknown): Promise<string> }).getTracker(req);

    // Should pick the first address from X-Forwarded-For (the real client IP)
    expect(tracker).toBe('ip:203.0.113.5');
  });

  it('returns ip:{addr} from req.ip when X-Forwarded-For is absent', async () => {
    const guard = makeGuard();
    const req = { user: undefined, headers: {}, ip: '192.168.1.42' };

    const tracker = await (guard as unknown as { getTracker(r: unknown): Promise<string> }).getTracker(req);

    expect(tracker).toBe('ip:192.168.1.42');
  });

  it('returns ip:unknown when no IP information is available', async () => {
    const guard = makeGuard();
    const req = { user: undefined, headers: {}, ip: undefined };

    const tracker = await (guard as unknown as { getTracker(r: unknown): Promise<string> }).getTracker(req);

    expect(tracker).toBe('ip:unknown');
  });

  it('prefers user ID over X-Forwarded-For when both are present', async () => {
    const guard = makeGuard();
    const req = {
      user: { id: 'auth-user-99' },
      headers: { 'x-forwarded-for': '1.1.1.1' },
      ip: '2.2.2.2',
    };

    const tracker = await (guard as unknown as { getTracker(r: unknown): Promise<string> }).getTracker(req);

    expect(tracker).toBe('user:auth-user-99');
  });

  it('handles X-Forwarded-For as an array (multiple proxy hops)', async () => {
    const guard = makeGuard();
    const req = {
      user: undefined,
      headers: { 'x-forwarded-for': ['203.0.113.99', '10.1.1.1'] },
      ip: '10.1.1.1',
    };

    const tracker = await (guard as unknown as { getTracker(r: unknown): Promise<string> }).getTracker(req);

    expect(tracker).toBe('ip:203.0.113.99');
  });

  it('trims whitespace from extracted IP', async () => {
    const guard = makeGuard();
    const req = {
      user: undefined,
      headers: { 'x-forwarded-for': '  203.0.113.5  , 10.0.0.1' },
      ip: '10.0.0.1',
    };

    const tracker = await (guard as unknown as { getTracker(r: unknown): Promise<string> }).getTracker(req);

    expect(tracker).toBe('ip:203.0.113.5');
  });
});

import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

/**
 * Rate-limiting guard keyed on the authenticated user ID when available.
 *
 * Rationale: the API Gateway sits behind corporate NATs and reverse proxies.
 * Keying on IP address alone would bucket all users at a shared IP together,
 * causing innocent users to hit limits when one client abuses the API.
 * When `SupabaseAuthGuard` has already validated the Bearer token and attached
 * `req.user`, we key on the user's UUID instead.
 *
 * Fallback order:
 *   1. Authenticated user ID     — preferred, per-user isolation
 *   2. X-Forwarded-For header   — real IP behind a proxy / load balancer
 *   3. Express req.ip            — direct connection
 *   4. Literal "unknown"         — last resort (still throttled as a group)
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const expressReq = req as unknown as Request & { user?: { id?: string } };

    if (expressReq.user?.id) {
      return `user:${expressReq.user.id}`;
    }

    const forwarded = expressReq.headers['x-forwarded-for'];
    const ip = Array.isArray(forwarded)
      ? forwarded[0]
      : (forwarded?.split(',')[0] ?? expressReq.ip ?? 'unknown');

    return `ip:${ip.trim()}`;
  }
}

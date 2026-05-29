import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Per-user rate limiter.
 * When a JWT is already attached to the request (req.user.id exists),
 * the throttle key is scoped to that user ID so each user gets their
 * own independent counter. Public / unauthenticated routes fall back
 * to the client IP, preserving the login rate-limit behaviour.
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const userId: string | undefined = req.user?.id;
    return userId ? `user:${userId}` : (req.ip as string);
  }
}

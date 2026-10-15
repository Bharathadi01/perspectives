import { ExecutionContext, SetMetadata, createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';

export const IS_PUBLIC = 'perspective:isPublic';
export const REQUIRES_LIVE_PROFILE = 'perspective:requiresLiveProfile';
export const SKIP_IDEMPOTENCY = 'perspective:skipIdempotency';

/** Opt a route out of the default-deny auth guard. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Require a live profile (selfie-verified, basics, audience, primary photo post). */
export const RequiresLiveProfile = () => SetMetadata(REQUIRES_LIVE_PROFILE, true);

/** Skip idempotency storage (only for routes that are naturally idempotent, e.g. account deletion). */
export const SkipIdempotency = () => SetMetadata(SKIP_IDEMPOTENCY, true);

export interface AuthUser {
  id: string;
}

export type AuthedRequest = Request & { user?: AuthUser; requestId?: string };

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => {
  const req = ctx.switchToHttp().getRequest<AuthedRequest>();
  if (!req.user) {
    throw new Error('CurrentUser used on a route without authentication');
  }
  return req.user;
});

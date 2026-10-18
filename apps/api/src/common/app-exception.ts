import { HttpStatus } from '@nestjs/common';
import type { ErrorCode } from '@perspective/contracts';

const DEFAULT_STATUS: Partial<Record<ErrorCode, HttpStatus>> = {
  UNAUTHORIZED: HttpStatus.UNAUTHORIZED,
  INVALID_CREDENTIALS: HttpStatus.UNAUTHORIZED,
  FORBIDDEN: HttpStatus.FORBIDDEN,
  ACCOUNT_SUSPENDED: HttpStatus.FORBIDDEN,
  PROFILE_INCOMPLETE: HttpStatus.FORBIDDEN,
  SELFIE_VERIFICATION_REQUIRED: HttpStatus.FORBIDDEN,
  DAILY_UNLOCK_INCOMPLETE: HttpStatus.FORBIDDEN,
  BLOCKED_PAIR: HttpStatus.FORBIDDEN,
  PROFILE_NOT_ELIGIBLE: HttpStatus.FORBIDDEN,
  POST_NOT_ELIGIBLE: HttpStatus.FORBIDDEN,
  PERSPECTIVE_REQUIRED_BEFORE_CONNECT: HttpStatus.FORBIDDEN,
  NOT_FOUND: HttpStatus.NOT_FOUND,
  CONFLICT: HttpStatus.CONFLICT,
  EMAIL_TAKEN: HttpStatus.CONFLICT,
  ALREADY_SUBMITTED: HttpStatus.CONFLICT,
  ALREADY_CONNECTED: HttpStatus.CONFLICT,
  CONNECTION_CLOSED: HttpStatus.GONE,
  CONNECT_REQUEST_PENDING: HttpStatus.CONFLICT,
  CONNECT_COOLDOWN_ACTIVE: HttpStatus.TOO_MANY_REQUESTS,
  CAP_REACHED: HttpStatus.TOO_MANY_REQUESTS,
  RATE_LIMITED: HttpStatus.TOO_MANY_REQUESTS,
  POST_LIMIT_REACHED: HttpStatus.UNPROCESSABLE_ENTITY,
  PRIMARY_POST_REQUIRED: HttpStatus.UNPROCESSABLE_ENTITY,
  MODERATION_FAILED: HttpStatus.UNPROCESSABLE_ENTITY,
  MEDIA_INVALID: HttpStatus.UNPROCESSABLE_ENTITY,
  UNDERAGE: HttpStatus.UNPROCESSABLE_ENTITY,
  VALIDATION_FAILED: HttpStatus.BAD_REQUEST,
  IDEMPOTENCY_KEY_REQUIRED: HttpStatus.BAD_REQUEST,
  INTERNAL_ERROR: HttpStatus.INTERNAL_SERVER_ERROR,
};

/** Typed application failure. The filter turns it into the standard error envelope. */
export class AppException extends Error {
  readonly status: number;

  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
    status?: number,
  ) {
    super(message);
    this.status = status ?? DEFAULT_STATUS[code] ?? HttpStatus.BAD_REQUEST;
  }
}

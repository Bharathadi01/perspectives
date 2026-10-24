import { ApiError } from '@perspective/api-client';

/** A message safe to show the user. Branches on stable codes, never on server wording. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case 'NETWORK_ERROR':
        return 'Could not reach Perspective. Check your connection and try again.';
      case 'VALIDATION_FAILED':
      case 'MODERATION_FAILED':
      case 'PERSPECTIVE_REQUIRED_BEFORE_CONNECT':
      case 'PERSPECTIVE_REQUIRED_BEFORE_ACCEPT':
      case 'CONNECT_COOLDOWN_ACTIVE':
      case 'CONNECT_REQUEST_PENDING':
      case 'ALREADY_SUBMITTED':
      case 'ALREADY_CONNECTED':
      case 'EMAIL_TAKEN':
      case 'INVALID_CREDENTIALS':
      case 'PRIMARY_POST_REQUIRED':
      case 'POST_LIMIT_REACHED':
      case 'MEDIA_INVALID':
      case 'DAILY_UNLOCK_INCOMPLETE':
      case 'CAP_REACHED':
      case 'UNDERAGE':
      case 'EMAIL_BLOCKED':
      case 'APPEAL_NOT_ALLOWED':
      case 'CONNECTION_PAUSED':
        return err.message;
      case 'UNAUTHORIZED':
        return 'Please sign in again.';
      case 'ACCOUNT_SUSPENDED':
        return 'This account is suspended.';
      case 'ACCOUNT_BANNED':
        return 'This account is banned.';
      case 'NOT_FOUND':
      case 'POST_NOT_ELIGIBLE':
      case 'PROFILE_NOT_ELIGIBLE':
        return 'This is no longer available.';
      case 'BLOCKED_PAIR':
        return 'You blocked this person.';
      case 'CONNECTION_CLOSED':
        return 'This connection closed because the conversation went quiet.';
      default:
        return 'Something went wrong. Please try again.';
    }
  }
  return 'Something went wrong. Please try again.';
}

export function errorCode(err: unknown): string | null {
  return err instanceof ApiError ? err.code : null;
}

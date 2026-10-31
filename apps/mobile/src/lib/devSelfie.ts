/**
 * A tiny 8×8 PNG used as the selfie in development, so the selfie check can be passed without a
 * camera (simulator, web). Only reachable behind `__DEV__`. The server's stub verifier approves
 * any uploaded selfie today (apps/api/src/moderation/moderation.ts); a real liveness check will not.
 */
export const DEV_SELFIE_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAFElEQVQI12P4z8CAFWDEEQZqGgAAeAwBAx7o5SMAAAAASUVORK5CYII=';

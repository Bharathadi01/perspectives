import { randomUUID } from 'node:crypto';
import type { NextFunction, Response } from 'express';
import type { AuthedRequest } from './decorators';

/** Gives every request an id for logs and error envelopes. */
export function requestIdMiddleware(req: AuthedRequest, res: Response, next: NextFunction): void {
  req.requestId = randomUUID();
  res.setHeader('x-request-id', req.requestId);
  next();
}

import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { ApiErrorEnvelope, ErrorCode } from '@perspective/contracts';
import type { Request, Response } from 'express';
import { AppException } from './app-exception';

function codeForHttpStatus(status: number): ErrorCode {
  switch (status) {
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 429:
      return 'RATE_LIMITED';
    default:
      return status >= 500 ? 'INTERNAL_ERROR' : 'VALIDATION_FAILED';
  }
}

/** Maps every failure to the standard envelope. Unknown failures are logged, never swallowed. */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ApiExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { requestId?: string }>();
    const requestId = req.requestId;

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: ErrorCode = 'INTERNAL_ERROR';
    let message = 'Something went wrong. Please try again.';
    let details: unknown;

    if (exception instanceof AppException) {
      status = exception.status;
      code = exception.code;
      message = exception.message;
      details = exception.details;
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError && exception.code === 'P2002') {
      status = HttpStatus.CONFLICT;
      code = 'CONFLICT';
      message = 'That already exists.';
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError && exception.code === 'P2025') {
      status = HttpStatus.NOT_FOUND;
      code = 'NOT_FOUND';
      message = 'Not found.';
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      code = codeForHttpStatus(status);
      message = status === HttpStatus.PAYLOAD_TOO_LARGE ? 'That file is too large.' : exception.message;
    }

    if (status >= 500) {
      const err = exception instanceof Error ? exception : new Error(String(exception));
      // Log the error and route only; never request bodies, tokens or user content.
      this.logger.error(`[${requestId}] ${req.method} ${req.route?.path ?? req.path}: ${err.message}`, err.stack);
    }

    const body: ApiErrorEnvelope = { error: { code, message, requestId, ...(details !== undefined ? { details } : {}) } };
    res.status(status).json(body);
  }
}

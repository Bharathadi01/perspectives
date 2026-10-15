import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { IDEMPOTENCY_HEADER } from '@perspective/contracts';
import type { Response } from 'express';
import { Observable, from, of, switchMap } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from './app-exception';
import { AuthedRequest, SKIP_IDEMPOTENCY } from './decorators';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Every authenticated mutation needs an `Idempotency-Key` (UUID). A retried request with the
 * same key returns the stored result instead of running twice. Failed requests are not stored,
 * so the client can retry them.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const res = context.switchToHttp().getResponse<Response>();
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_IDEMPOTENCY, [context.getHandler(), context.getClass()]);
    if (!MUTATING.has(req.method) || !req.user || skip) {
      return next.handle();
    }

    const key = req.header(IDEMPOTENCY_HEADER);
    if (!key || !UUID.test(key)) {
      throw new AppException('IDEMPOTENCY_KEY_REQUIRED', 'Missing or invalid Idempotency-Key header.');
    }
    const actorId = req.user.id;
    const scope = `${req.method} ${req.path}`;

    return from(
      this.prisma.idempotencyRecord.findUnique({ where: { actorId_scope_key: { actorId, scope, key } } }),
    ).pipe(
      switchMap((existing) => {
        if (existing) {
          res.status(existing.statusCode);
          return of(existing.responseBody ?? undefined);
        }
        return next.handle().pipe(
          switchMap((body: unknown) =>
            from(this.store(actorId, scope, key, res.statusCode, body)).pipe(switchMap(() => of(body))),
          ),
        );
      }),
    );
  }

  private async store(actorId: string, scope: string, key: string, statusCode: number, body: unknown): Promise<void> {
    try {
      await this.prisma.idempotencyRecord.create({
        data: {
          actorId,
          scope,
          key,
          statusCode,
          responseBody: body === undefined ? Prisma.JsonNull : (body as Prisma.InputJsonValue),
        },
      });
    } catch (err) {
      // A concurrent retry stored the same key first; the result is equivalent.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return;
      throw err;
    }
  }
}

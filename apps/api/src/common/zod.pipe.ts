import { PipeTransform } from '@nestjs/common';
import type { ZodTypeAny, output } from 'zod';
import { AppException } from './app-exception';

/** Validates a body or query against a contracts schema; unknown fields are stripped. */
export class ZodPipe<S extends ZodTypeAny> implements PipeTransform<unknown, output<S>> {
  constructor(private readonly schema: S) {}

  transform(value: unknown): output<S> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new AppException(
        'VALIDATION_FAILED',
        result.error.issues[0]?.message ?? 'Invalid input',
        result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      );
    }
    return result.data;
  }
}

/** Validates a UUID route parameter. */
export class UuidPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
      throw new AppException('NOT_FOUND', 'Not found.');
    }
    return value;
  }
}

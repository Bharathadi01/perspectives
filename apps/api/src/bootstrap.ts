import { NestExpressApplication } from '@nestjs/platform-express';

/** Shared by main.ts and the e2e tests so both run the same HTTP setup. */
export function configureApp(app: NestExpressApplication): void {
  // Media uploads arrive as base64 JSON (8 MB binary limit plus encoding overhead).
  app.useBodyParser('json', { limit: '12mb' });
  app.enableCors({ exposedHeaders: ['x-request-id'] });
}

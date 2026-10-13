import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { HealthController } from './health/health.controller';
import { ExploreController } from './explore/explore.controller';
import { ExploreService } from './explore/explore.service';
import { RequestsController } from './requests/requests.controller';
import { RequestsService } from './requests/requests.service';
import { ResponsesController } from './responses/responses.controller';
import { ResponsesService } from './responses/responses.service';
import { ConnectionsController } from './connections/connections.controller';
import { ConnectionsService } from './connections/connections.service';
import { SafetyController } from './safety/safety.controller';
import { SafetyService } from './safety/safety.service';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import { AuthGuard } from './common/guards/auth.guard';

@Module({
  imports: [],
  controllers: [
    HealthController,
    ExploreController,
    RequestsController,
    ResponsesController,
    ConnectionsController,
    SafetyController,
  ],
  providers: [
    ExploreService,
    RequestsService,
    ResponsesService,
    ConnectionsService,
    SafetyService,
    {
      provide: APP_FILTER,
      useClass: ApiExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}

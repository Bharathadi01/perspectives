import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AdminModule } from './admin/admin.controller';
import { AuthModule } from './auth/auth.module';
import { ApiExceptionFilter } from './common/api-exception.filter';
import { AuthGuard } from './common/auth.guard';
import { IdempotencyInterceptor } from './common/idempotency.interceptor';
import { requestIdMiddleware } from './common/request-id.middleware';
import { ConfigModule } from './config/config.module';
import { ConnectModule } from './connect/connect.module';
import { DailyModule } from './daily/daily.module';
import { EnforcementModule } from './enforcement/enforcement.service';
import { ExploreModule } from './explore/explore.module';
import { HealthController } from './health/health.controller';
import { MediaModule } from './media/media.module';
import { ModerationModule } from './moderation/moderation';
import { NoticesModule } from './notices/notices.controller';
import { PerspectivesModule } from './perspectives/perspectives.module';
import { PrismaModule } from './prisma/prisma.service';
import { PushApiModule } from './push/push.controller';
import { PushModule } from './push/push.service';
import { MapperModule } from './profiles/mapper.module';
import { ProfilesModule } from './profiles/profiles.module';
import { SafetyModule } from './safety/safety.module';
import { SocialModule } from './social/social.service';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    AuthModule,
    SocialModule,
    ModerationModule,
    MediaModule,
    MapperModule,
    PushModule,
    PushApiModule,
    NoticesModule,
    EnforcementModule,
    DailyModule,
    ConnectModule,
    ProfilesModule,
    ExploreModule,
    PerspectivesModule,
    SafetyModule,
    AdminModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(requestIdMiddleware).forRoutes('*');
  }
}

import { Body, Controller, Get, HttpCode, HttpStatus, Module, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  AdminActionInput,
  AdminActionInputSchema,
  AdminCase,
  AdminLoginInput,
  AdminLoginInputSchema,
  AdminQueueItem,
  AdminSession,
  AppealDecisionInput,
  AppealDecisionInputSchema,
} from '@perspective/contracts';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { Public } from '../common/decorators';
import { UuidPipe, ZodPipe } from '../common/zod.pipe';
import { AdminAuthService, AdminGuard, AdminRequest } from './admin-auth.service';
import { AdminService } from './admin.service';

const CurrentAdmin = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const admin = ctx.switchToHttp().getRequest<AdminRequest>().admin;
  if (!admin) throw new Error('CurrentAdmin used without AdminGuard');
  return admin;
});

/**
 * The admin API (docs/SECURITY.md → Admin access and enforcement). User tokens never work here: the
 * user guard is skipped (@Public) and AdminGuard accepts only an admin token.
 */
@ApiTags('Admin')
@Public()
@Controller('v1/admin')
export class AdminController {
  constructor(
    private readonly auth: AdminAuthService,
    private readonly admin: AdminService,
  ) {}

  @Post('session')
  @HttpCode(HttpStatus.OK)
  logIn(@Body(new ZodPipe(AdminLoginInputSchema)) body: AdminLoginInput): Promise<AdminSession> {
    return this.auth.logIn(body);
  }

  @UseGuards(AdminGuard)
  @Get('queue')
  queue(): Promise<AdminQueueItem[]> {
    return this.admin.queue();
  }

  @UseGuards(AdminGuard)
  @Get('people/:userId')
  person(@CurrentAdmin() a: { id: string }, @Param('userId', UuidPipe) userId: string): Promise<AdminCase> {
    return this.admin.case(a.id, userId);
  }

  @UseGuards(AdminGuard)
  @Post('people/:userId/actions')
  @HttpCode(HttpStatus.OK)
  act(
    @CurrentAdmin() a: { id: string },
    @Param('userId', UuidPipe) userId: string,
    @Body(new ZodPipe(AdminActionInputSchema)) body: AdminActionInput,
  ): Promise<AdminCase> {
    return this.admin.act(a.id, userId, body.action, body.reason);
  }

  @UseGuards(AdminGuard)
  @Post('appeals/:appealId/decision')
  @HttpCode(HttpStatus.OK)
  decide(
    @CurrentAdmin() a: { id: string },
    @Param('appealId', UuidPipe) appealId: string,
    @Body(new ZodPipe(AppealDecisionInputSchema)) body: AppealDecisionInput,
  ): Promise<AdminCase> {
    return this.admin.decideAppeal(a.id, appealId, body.decision, body.reason);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [AdminController],
  providers: [AdminAuthService, AdminGuard, AdminService],
})
export class AdminModule {}

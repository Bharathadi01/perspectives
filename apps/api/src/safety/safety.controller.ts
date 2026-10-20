import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  BlockedPerson,
  AppealInput,
  AppealInputSchema,
  CreateReportInput,
  CreateReportInputSchema,
  DeleteAccountInput,
  DeleteAccountInputSchema,
  Restriction,
} from '@perspective/contracts';
import { AllowRestricted, AuthUser, CurrentUser, SkipIdempotency } from '../common/decorators';
import { UuidPipe, ZodPipe } from '../common/zod.pipe';
import { RestrictionService } from './restriction.service';
import { SafetyService } from './safety.service';

@ApiTags('Safety')
@Controller('v1')
export class SafetyController {
  constructor(
    private readonly safety: SafetyService,
    private readonly restrictions: RestrictionService,
  ) {}

  @Post('reports')
  report(@CurrentUser() user: AuthUser, @Body(new ZodPipe(CreateReportInputSchema)) body: CreateReportInput): Promise<{ reportId: string }> {
    return this.safety.report(user.id, body);
  }

  @Post('blocks/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async block(@CurrentUser() user: AuthUser, @Param('userId', UuidPipe) userId: string): Promise<void> {
    await this.safety.block(user.id, userId);
  }

  /** You → Blocked people: everyone you blocked, newest first. */
  @Get('blocks')
  blocked(@CurrentUser() user: AuthUser): Promise<BlockedPerson[]> {
    return this.safety.blocked(user.id);
  }

  @Delete('blocks/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unblock(@CurrentUser() user: AuthUser, @Param('userId', UuidPipe) userId: string): Promise<void> {
    await this.safety.unblock(user.id, userId);
  }

  /** The ban screen: reason, end date (or permanent), and the appeal. Only for suspended or banned people. */
  @AllowRestricted()
  @Get('account/restriction')
  restriction(@CurrentUser() user: AuthUser): Promise<Restriction> {
    return this.restrictions.restriction(user.id);
  }

  /** One appeal per ban ("This was a mistake"). */
  @AllowRestricted()
  @Post('account/appeal')
  @HttpCode(HttpStatus.OK)
  appeal(@CurrentUser() user: AuthUser, @Body(new ZodPipe(AppealInputSchema)) body: AppealInput): Promise<Restriction> {
    return this.restrictions.appeal(user.id, body.message);
  }

  /** Naturally idempotent: once deleted, a retry is unauthenticated. Also open to banned people. */
  @AllowRestricted()
  @SkipIdempotency()
  @Post('account/deletion')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAccount(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(DeleteAccountInputSchema)) body: DeleteAccountInput,
  ): Promise<void> {
    await this.safety.deleteAccount(user.id, body);
  }
}

import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  CreateReportInput,
  CreateReportInputSchema,
  DeleteAccountInput,
  DeleteAccountInputSchema,
} from '@perspective/contracts';
import { AuthUser, CurrentUser, SkipIdempotency } from '../common/decorators';
import { UuidPipe, ZodPipe } from '../common/zod.pipe';
import { SafetyService } from './safety.service';

@ApiTags('Safety')
@Controller('v1')
export class SafetyController {
  constructor(private readonly safety: SafetyService) {}

  @Post('reports')
  report(@CurrentUser() user: AuthUser, @Body(new ZodPipe(CreateReportInputSchema)) body: CreateReportInput): Promise<{ reportId: string }> {
    return this.safety.report(user.id, body);
  }

  @Post('blocks/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async block(@CurrentUser() user: AuthUser, @Param('userId', UuidPipe) userId: string): Promise<void> {
    await this.safety.block(user.id, userId);
  }

  @Delete('blocks/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unblock(@CurrentUser() user: AuthUser, @Param('userId', UuidPipe) userId: string): Promise<void> {
    await this.safety.unblock(user.id, userId);
  }

  /** Naturally idempotent: once deleted, a retry is unauthenticated. */
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

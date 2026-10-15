import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  GivenPerspective,
  GivePerspectiveInputSchema,
  GivePerspectiveParsed,
  GivePerspectiveResult,
  Inbox,
  PerspectiveFeedback,
  PerspectiveFeedbackInput,
  PerspectiveFeedbackInputSchema,
} from '@perspective/contracts';
import { AuthUser, CurrentUser, RequiresLiveProfile } from '../common/decorators';
import { UuidPipe, ZodPipe } from '../common/zod.pipe';
import { PerspectivesService } from './perspectives.service';

@ApiTags('Perspectives & inbox')
@RequiresLiveProfile()
@Controller('v1')
export class PerspectivesController {
  constructor(private readonly perspectives: PerspectivesService) {}

  @Post('perspectives')
  give(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(GivePerspectiveInputSchema)) body: GivePerspectiveParsed,
  ): Promise<GivePerspectiveResult> {
    return this.perspectives.give(user.id, body);
  }

  @Get('perspectives/given')
  given(@CurrentUser() user: AuthUser): Promise<GivenPerspective[]> {
    return this.perspectives.given(user.id);
  }

  @Post('perspectives/:id/feedback')
  @HttpCode(HttpStatus.OK)
  feedback(
    @CurrentUser() user: AuthUser,
    @Param('id', UuidPipe) id: string,
    @Body(new ZodPipe(PerspectiveFeedbackInputSchema)) body: PerspectiveFeedbackInput,
  ): Promise<PerspectiveFeedback> {
    return this.perspectives.feedback(user.id, id, body);
  }

  @Get('inbox')
  inbox(@CurrentUser() user: AuthUser): Promise<Inbox> {
    return this.perspectives.inbox(user.id);
  }
}

import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ExploreResponse, SkipProfileInput, SkipProfileInputSchema } from '@perspective/contracts';
import { AuthUser, CurrentUser, RequiresLiveProfile } from '../common/decorators';
import { ZodPipe } from '../common/zod.pipe';
import { ExploreService } from './explore.service';

@ApiTags('Explore')
@RequiresLiveProfile()
@Controller('v1/explore')
export class ExploreController {
  constructor(private readonly explore: ExploreService) {}

  @Get()
  next(@CurrentUser() user: AuthUser): Promise<ExploreResponse> {
    return this.explore.next(user.id);
  }

  /** Private skip, no notification. A skipped mandatory slot is replaced. */
  @Post('skip')
  @HttpCode(HttpStatus.OK)
  skip(@CurrentUser() user: AuthUser, @Body(new ZodPipe(SkipProfileInputSchema)) body: SkipProfileInput): Promise<ExploreResponse> {
    return this.explore.skip(user.id, body.profileId);
  }
}

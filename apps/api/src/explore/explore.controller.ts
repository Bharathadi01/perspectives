import { Controller, Get, Post, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ExploreService } from './explore.service';
import { SkipRequestInput } from '@perspective/contracts';

@ApiTags('Explore')
@Controller('v1/explore')
export class ExploreController {
  constructor(private readonly exploreService: ExploreService) {}

  @Get()
  @ApiOperation({ summary: 'Get finite daily batch with server-issued impression token' })
  @ApiResponse({ status: 200, description: 'Finite ranked batch returned.' })
  async getExploreBatch(@Req() req: any) {
    return this.exploreService.getBatch(req.user?.id || 'usr_me_001');
  }

  @Post('skip')
  @ApiOperation({ summary: 'Skip an explore request without negative feedback' })
  async skipRequest(@Req() req: any, @Body() body: SkipRequestInput) {
    return this.exploreService.skip(req.user?.id || 'usr_me_001', body);
  }
}

import { Controller, Post, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SafetyService } from './safety.service';
import {
  CreateReportInput,
  BlockUserInput,
  DeleteAccountInput,
} from '@perspective/contracts';

@ApiTags('Safety, Blocking & Deletion')
@Controller('v1')
export class SafetyController {
  constructor(private readonly safetyService: SafetyService) {}

  @Post('reports')
  @ApiOperation({ summary: 'Report request, response, message or user with reason code' })
  async createReport(@Req() req: any, @Body() body: CreateReportInput) {
    return this.safetyService.report(req.user?.id || 'usr_me_001', body);
  }

  @Post('blocks')
  @ApiOperation({ summary: 'Block user bidirectionally across discovery, inbox, and chat' })
  async blockUser(@Req() req: any, @Body() body: BlockUserInput) {
    return this.safetyService.block(req.user?.id || 'usr_me_001', body);
  }

  @Post('account/deletion')
  @ApiOperation({ summary: 'Request permanent DPDP-compliant account and data deletion' })
  async deleteAccount(@Req() req: any, @Body() body: DeleteAccountInput) {
    return this.safetyService.deleteAccount(req.user?.id || 'usr_me_001', body);
  }
}

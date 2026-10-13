import { Controller, Get, Post, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ResponsesService } from './responses.service';
import { SubmitResponseInput, SubmitFeedbackInput } from '@perspective/contracts';

@ApiTags('Responses & Inbox')
@Controller('v1')
export class ResponsesController {
  constructor(private readonly responsesService: ResponsesService) {}

  @Post('requests/:id/responses')
  @ApiOperation({ summary: 'Submit a structured perspective response' })
  @ApiResponse({ status: 201, description: 'Perspective response delivered.' })
  async submitResponse(@Req() req: any, @Body() body: SubmitResponseInput) {
    return this.responsesService.submit(req.user?.id || 'usr_me_001', body);
  }

  @Get('inbox')
  @ApiOperation({ summary: 'Get perspectives inbox for current requester' })
  async getInbox(@Req() req: any) {
    return this.responsesService.getInbox(req.user?.id || 'usr_me_001');
  }

  @Post('responses/:id/feedback')
  @ApiOperation({ summary: 'Submit helpful / not helpful feedback and connection intent' })
  async submitFeedback(@Req() req: any, @Body() body: SubmitFeedbackInput) {
    return this.responsesService.submitFeedback(req.user?.id || 'usr_me_001', body);
  }
}

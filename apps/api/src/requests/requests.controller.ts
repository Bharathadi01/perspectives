import { Controller, Get, Post, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RequestsService } from './requests.service';
import { CreateRequestInput } from '@perspective/contracts';

@ApiTags('Requests')
@Controller('v1/requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new Perspective Request' })
  @ApiResponse({ status: 201, description: 'Perspective Request created.' })
  async createRequest(@Req() req: any, @Body() body: CreateRequestInput) {
    return this.requestsService.create(req.user?.id || 'usr_me_001', body);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get all requests created by current user' })
  async getMyRequests(@Req() req: any) {
    return this.requestsService.getMyRequests(req.user?.id || 'usr_me_001');
  }
}

import { Controller, Get, Post, Param, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConnectionsService } from './connections.service';
import { SendMessageInput } from '@perspective/contracts';

@ApiTags('Connections & Chat')
@Controller('v1/connections')
export class ConnectionsController {
  constructor(private readonly connectionsService: ConnectionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get active mutual connections' })
  async getConnections(@Req() req: any) {
    return this.connectionsService.getConnections(req.user?.id || 'usr_me_001');
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Get messages for a mutual connection' })
  async getMessages(@Req() req: any, @Param('id') connectionId: string) {
    return this.connectionsService.getMessages(req.user?.id || 'usr_me_001', connectionId);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Send message in an authorized connection room' })
  async sendMessage(
    @Req() req: any,
    @Param('id') connectionId: string,
    @Body() body: Omit<SendMessageInput, 'connectionId'>
  ) {
    return this.connectionsService.sendMessage(req.user?.id || 'usr_me_001', {
      ...body,
      connectionId,
    });
  }
}

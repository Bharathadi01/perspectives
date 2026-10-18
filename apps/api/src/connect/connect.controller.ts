import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  Connection,
  ConnectRequestResult,
  CreateConnectRequestInput,
  CreateConnectRequestInputSchema,
  MarkConnectionsSeenInput,
  MarkConnectionsSeenInputSchema,
  Message,
  SendMessageInput,
  SendMessageInputSchema,
} from '@perspective/contracts';
import { AuthUser, CurrentUser, RequiresLiveProfile } from '../common/decorators';
import { UuidPipe, ZodPipe } from '../common/zod.pipe';
import { ConnectService } from './connect.service';

@ApiTags('Connect & chat')
@RequiresLiveProfile()
@Controller('v1')
export class ConnectController {
  constructor(private readonly connect: ConnectService) {}

  /** Open Connect: allowed only after the sender gave the receiver a perspective. */
  @Post('connect-requests')
  request(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(CreateConnectRequestInputSchema)) body: CreateConnectRequestInput,
  ): Promise<ConnectRequestResult> {
    return this.connect.request(user.id, body.receiverId);
  }

  @Post('connect-requests/:id/accept')
  @HttpCode(HttpStatus.OK)
  accept(@CurrentUser() user: AuthUser, @Param('id', UuidPipe) id: string): Promise<Connection> {
    return this.connect.accept(user.id, id);
  }

  @Post('connect-requests/:id/decline')
  @HttpCode(HttpStatus.OK)
  decline(@CurrentUser() user: AuthUser, @Param('id', UuidPipe) id: string): Promise<ConnectRequestResult> {
    return this.connect.decline(user.id, id);
  }

  @Get('connections')
  connections(@CurrentUser() user: AuthUser): Promise<Connection[]> {
    return this.connect.connections(user.id);
  }

  /** New connections the viewer has not seen the "you're connected" moment for yet. */
  @Get('connections/unseen')
  unseen(@CurrentUser() user: AuthUser): Promise<Connection[]> {
    return this.connect.unseen(user.id);
  }

  @Post('connections/seen')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markSeen(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(MarkConnectionsSeenInputSchema)) body: MarkConnectionsSeenInput,
  ): Promise<void> {
    await this.connect.markSeen(user.id, body.connectionIds);
  }

  @Get('connections/:id/messages')
  messages(@CurrentUser() user: AuthUser, @Param('id', UuidPipe) id: string): Promise<Message[]> {
    return this.connect.messages(user.id, id);
  }

  @Post('connections/:id/messages')
  send(
    @CurrentUser() user: AuthUser,
    @Param('id', UuidPipe) id: string,
    @Body(new ZodPipe(SendMessageInputSchema)) body: SendMessageInput,
  ): Promise<Message> {
    return this.connect.send(user.id, id, body.text);
  }

  @Delete('connections/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unmatch(@CurrentUser() user: AuthUser, @Param('id', UuidPipe) id: string): Promise<void> {
    await this.connect.unmatch(user.id, id);
  }
}

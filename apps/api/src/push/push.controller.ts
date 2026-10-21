import { Body, Controller, Delete, HttpCode, HttpStatus, Module, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  RegisterPushTokenInput,
  RegisterPushTokenInputSchema,
  RemovePushTokenInput,
  RemovePushTokenInputSchema,
} from '@perspective/contracts';
import { AllowRestricted, AuthUser, CurrentUser } from '../common/decorators';
import { ZodPipe } from '../common/zod.pipe';
import { PushModule, PushService } from './push.service';

/** The app registers this device for pushes after sign-in and removes it on sign-out. */
@ApiTags('Push')
@Controller('v1/me/push-tokens')
export class PushController {
  constructor(private readonly push: PushService) {}

  /** Also open to suspended or banned people, so account updates can still reach them. */
  @AllowRestricted()
  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  async register(@CurrentUser() user: AuthUser, @Body(new ZodPipe(RegisterPushTokenInputSchema)) body: RegisterPushTokenInput): Promise<void> {
    await this.push.registerToken(user.id, body.token, body.platform);
  }

  @AllowRestricted()
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AuthUser, @Body(new ZodPipe(RemovePushTokenInputSchema)) body: RemovePushTokenInput): Promise<void> {
    await this.push.removeToken(user.id, body.token);
  }
}

@Module({ imports: [PushModule], controllers: [PushController] })
export class PushApiModule {}

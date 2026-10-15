import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  MyProfile,
  ProfileView,
  SelfieVerificationInput,
  SelfieVerificationInputSchema,
  UpdateProfileInput,
  UpdateProfileInputSchema,
} from '@perspective/contracts';
import { AuthUser, CurrentUser, RequiresLiveProfile } from '../common/decorators';
import { UuidPipe, ZodPipe } from '../common/zod.pipe';
import { ProfilesService } from './profiles.service';

@ApiTags('Profiles')
@Controller('v1')
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser): Promise<MyProfile> {
    return this.profiles.mine(user.id);
  }

  @Patch('me')
  update(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(UpdateProfileInputSchema)) body: UpdateProfileInput,
  ): Promise<MyProfile> {
    return this.profiles.update(user.id, body);
  }

  @Post('me/selfie-verification')
  @HttpCode(HttpStatus.OK)
  verifySelfie(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(SelfieVerificationInputSchema)) body: SelfieVerificationInput,
  ): Promise<MyProfile> {
    return this.profiles.verifySelfie(user.id, body.mediaId);
  }

  @RequiresLiveProfile()
  @Get('profiles/:id')
  view(@CurrentUser() user: AuthUser, @Param('id', UuidPipe) id: string): Promise<ProfileView> {
    return this.profiles.view(user.id, id);
  }
}

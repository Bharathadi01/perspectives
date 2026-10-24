import { Controller, Get, HttpCode, HttpStatus, Module, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Notices } from '@perspective/contracts';
import { AuthUser, CurrentUser } from '../common/decorators';
import { NoticesService, NoticesServiceModule } from './notices.service';

@ApiTags('Notices')
@Controller('v1/notices')
export class NoticesController {
  constructor(private readonly notices: NoticesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<Notices> {
    return this.notices.list(user.id);
  }

  @Post('read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAllRead(@CurrentUser() user: AuthUser): Promise<void> {
    await this.notices.markAllRead(user.id);
  }
}

@Module({ imports: [NoticesServiceModule], controllers: [NoticesController] })
export class NoticesModule {}

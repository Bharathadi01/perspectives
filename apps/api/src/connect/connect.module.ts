import { Module } from '@nestjs/common';
import { ConnectExpirySweeper } from './connect-expiry.sweeper';
import { ConnectController } from './connect.controller';
import { ConnectService } from './connect.service';

@Module({
  controllers: [ConnectController],
  providers: [ConnectService, ConnectExpirySweeper],
  exports: [ConnectService],
})
export class ConnectModule {}

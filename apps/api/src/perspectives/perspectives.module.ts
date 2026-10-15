import { Module } from '@nestjs/common';
import { ConnectModule } from '../connect/connect.module';
import { PerspectivesController } from './perspectives.controller';
import { PerspectivesService } from './perspectives.service';

@Module({
  imports: [ConnectModule],
  controllers: [PerspectivesController],
  providers: [PerspectivesService],
})
export class PerspectivesModule {}

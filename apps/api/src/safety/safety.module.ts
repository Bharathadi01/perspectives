import { Module } from '@nestjs/common';
import { ConnectModule } from '../connect/connect.module';
import { MediaModule } from '../media/media.module';
import { SafetyController } from './safety.controller';
import { RestrictionService } from './restriction.service';
import { SafetyService } from './safety.service';

@Module({
  imports: [ConnectModule, MediaModule],
  controllers: [SafetyController],
  providers: [SafetyService, RestrictionService],
})
export class SafetyModule {}

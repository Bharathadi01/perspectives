import { Global, Module } from '@nestjs/common';
import { CandidatesService } from './candidates.service';
import { DailyService } from './daily.service';

@Global()
@Module({
  providers: [CandidatesService, DailyService],
  exports: [CandidatesService, DailyService],
})
export class DailyModule {}

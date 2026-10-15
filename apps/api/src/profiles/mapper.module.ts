import { Global, Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { ProfileMapper } from './profile.mapper';

@Global()
@Module({
  imports: [MediaModule],
  providers: [ProfileMapper],
  exports: [ProfileMapper],
})
export class MapperModule {}

import { Module } from '@nestjs/common';
import { MediaUrlSigner } from './media-url.signer';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { LocalDiskMediaStorage, MediaStorage } from './media.storage';

@Module({
  controllers: [MediaController],
  providers: [MediaService, MediaUrlSigner, { provide: MediaStorage, useClass: LocalDiskMediaStorage }],
  exports: [MediaService, MediaUrlSigner],
})
export class MediaModule {}

import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MediaUploadResult, UploadMediaInput, UploadMediaInputSchema } from '@perspective/contracts';
import type { Response } from 'express';
import { AppException } from '../common/app-exception';
import { AuthUser, CurrentUser, Public } from '../common/decorators';
import { UuidPipe, ZodPipe } from '../common/zod.pipe';
import { MediaUrlSigner } from './media-url.signer';
import { MediaService } from './media.service';

@ApiTags('Media')
@Controller('v1/media')
export class MediaController {
  constructor(
    private readonly media: MediaService,
    private readonly signer: MediaUrlSigner,
  ) {}

  @Post()
  upload(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(UploadMediaInputSchema)) body: UploadMediaInput,
  ): Promise<MediaUploadResult> {
    return this.media.upload(user.id, body);
  }

  /** Public, but only reachable through a short-lived signed URL. */
  @Public()
  @Get(':id/content')
  async content(
    @Param('id', UuidPipe) id: string,
    @Query('exp') exp: string,
    @Query('sig') sig: string,
    @Res() res: Response,
  ): Promise<void> {
    if (!this.signer.verify(id, exp, sig)) {
      throw new AppException('NOT_FOUND', 'Not found.');
    }
    const { data, mimeType } = await this.media.content(id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.send(data);
  }
}

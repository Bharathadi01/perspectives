import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { MediaUploadResult, UploadMediaInput } from '@perspective/contracts';
import { AppException } from '../common/app-exception';
import { PrismaService } from '../prisma/prisma.service';
import { MediaStorage } from './media.storage';

function looksLikeImage(buf: Buffer, mimeType: string): boolean {
  if (mimeType === 'image/jpeg') return buf[0] === 0xff && buf[1] === 0xd8;
  if (mimeType === 'image/png') return buf.subarray(0, 4).toString('hex') === '89504e47';
  if (mimeType === 'image/webp') return buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP';
  return false;
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger('MediaService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: MediaStorage,
  ) {}

  /**
   * Stores an upload. Photos are checked by file signature. Not done yet: EXIF stripping and
   * media moderation (needs the canonical media provider); audio duration is client-reported.
   */
  async upload(ownerId: string, input: UploadMediaInput): Promise<MediaUploadResult> {
    const data = Buffer.from(input.dataBase64, 'base64');
    if (data.length === 0) {
      throw new AppException('MEDIA_INVALID', 'The file is empty.');
    }
    if (input.kind === 'photo' && !looksLikeImage(data, input.mimeType)) {
      throw new AppException('MEDIA_INVALID', 'That file is not a supported image.');
    }
    const storageKey = randomUUID();
    await this.storage.put(storageKey, data);
    const media = await this.prisma.media.create({
      data: {
        ownerId,
        kind: input.kind,
        mimeType: input.mimeType,
        storageKey,
        byteSize: data.length,
        durationSec: input.kind === 'audio' ? (input.durationSec ?? null) : null,
      },
      select: { id: true, kind: true },
    });
    return { mediaId: media.id, kind: media.kind };
  }

  /** Content for a signed URL. Selfie-verification media is never served. */
  async content(mediaId: string): Promise<{ data: Buffer; mimeType: string }> {
    const media = await this.prisma.media.findUnique({ where: { id: mediaId } });
    if (!media || media.purpose !== 'post') {
      throw new AppException('NOT_FOUND', 'Not found.');
    }
    return { data: await this.storage.get(media.storageKey), mimeType: media.mimeType };
  }

  /** Removes stored files for a user (account deletion). Rows go with the user cascade. */
  async removeAllFilesFor(ownerId: string): Promise<void> {
    const rows = await this.prisma.media.findMany({ where: { ownerId }, select: { storageKey: true } });
    for (const row of rows) {
      try {
        await this.storage.remove(row.storageKey);
      } catch (err) {
        this.logger.error(`Failed to remove a media file during deletion`, err instanceof Error ? err.stack : undefined);
        throw err;
      }
    }
  }
}

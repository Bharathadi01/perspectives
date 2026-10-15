import { Inject, Injectable } from '@nestjs/common';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { APP_CONFIG, AppConfig } from '../config/app-config';

/**
 * Storage boundary. v1 uses local disk for development; the canonical provider (Cloudinary or
 * S3, see docs/DECISIONS.md) replaces this class without touching callers.
 */
export abstract class MediaStorage {
  abstract put(key: string, data: Buffer): Promise<void>;
  abstract get(key: string): Promise<Buffer>;
  abstract remove(key: string): Promise<void>;
}

@Injectable()
export class LocalDiskMediaStorage extends MediaStorage {
  private readonly root: string;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    super();
    this.root = resolve(config.MEDIA_STORAGE_DIR);
  }

  async put(key: string, data: Buffer): Promise<void> {
    await mkdir(this.root, { recursive: true });
    await writeFile(this.path(key), data);
  }

  get(key: string): Promise<Buffer> {
    return readFile(this.path(key));
  }

  async remove(key: string): Promise<void> {
    await rm(this.path(key), { force: true });
  }

  private path(key: string): string {
    if (!/^[0-9a-f-]{36}$/.test(key)) throw new Error('Invalid storage key');
    return join(this.root, key);
  }
}

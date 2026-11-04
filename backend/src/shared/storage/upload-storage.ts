import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createReadStream,
  existsSync,
  mkdirSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';
import type { ReadStream } from 'fs';

export type StoredObject = {
  /** Path key relative to storage root (local) or object key (S3). */
  key: string;
};

export interface UploadStoragePort {
  write(key: string, buffer: Buffer): Promise<StoredObject>;
  openReadStream(key: string): ReadStream;
  delete(key: string): Promise<void>;
  absolutePathForKey(key: string): string;
}

@Injectable()
export class LocalUploadStorage implements UploadStoragePort {
  private readonly root: string;

  constructor(config: ConfigService) {
    this.root = config.get<string>('UPLOAD_DIR', './uploads');
    mkdirSync(this.root, { recursive: true });
  }

  async write(key: string, buffer: Buffer): Promise<StoredObject> {
    const absolute = this.absolutePathForKey(key);
    mkdirSync(join(absolute, '..'), { recursive: true });
    writeFileSync(absolute, buffer);
    return { key };
  }

  openReadStream(key: string): ReadStream {
    const absolute = this.absolutePathForKey(key);
    if (!existsSync(absolute)) {
      throw new ServiceUnavailableException('Upload file missing on disk');
    }
    return createReadStream(absolute);
  }

  async delete(key: string): Promise<void> {
    const absolute = this.absolutePathForKey(key);
    if (existsSync(absolute)) unlinkSync(absolute);
  }

  absolutePathForKey(key: string): string {
    return join(this.root, key);
  }
}

/**
 * S3/R2 adapter stub — set UPLOAD_STORAGE=s3 and configure bucket/region.
 * Full signed-URL delivery is P1-4 follow-up; local disk remains the default.
 */
@Injectable()
export class S3UploadStorageStub implements UploadStoragePort {
  private readonly logger = new Logger(S3UploadStorageStub.name);

  constructor(private readonly config: ConfigService) {
    this.logger.warn(
      'UPLOAD_STORAGE=s3 is configured but the S3 adapter is a stub — set UPLOAD_STORAGE=local or implement P1-4',
    );
  }

  private assertConfigured(): void {
    const bucket = this.config.get<string>('S3_BUCKET');
    if (!bucket) {
      throw new ServiceUnavailableException(
        'S3 upload storage is not configured (set S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY)',
      );
    }
    throw new ServiceUnavailableException(
      'S3 upload storage adapter is not implemented yet — use UPLOAD_STORAGE=local',
    );
  }

  write(_key: string, _buffer: Buffer): Promise<StoredObject> {
    this.assertConfigured();
    return Promise.reject(new Error('unreachable'));
  }

  openReadStream(_key: string): ReadStream {
    this.assertConfigured();
    throw new Error('unreachable');
  }

  delete(_key: string): Promise<void> {
    this.assertConfigured();
    return Promise.reject(new Error('unreachable'));
  }

  absolutePathForKey(key: string): string {
    return key;
  }
}

export const UPLOAD_STORAGE = 'UPLOAD_STORAGE';

export function uploadStorageFactory(
  config: ConfigService,
): UploadStoragePort {
  const mode = (config.get<string>(UPLOAD_STORAGE) ?? 'local').toLowerCase();
  if (mode === 's3' || mode === 'r2') {
    return new S3UploadStorageStub(config);
  }
  return new LocalUploadStorage(config);
}

import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  createReadStream,
  existsSync,
  mkdirSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';
import type { ReadStream } from 'fs';
import { Readable } from 'stream';

export type StoredObject = {
  /** Path key relative to storage root (local) or object key (S3). */
  key: string;
};

export interface UploadStoragePort {
  write(key: string, buffer: Buffer): Promise<StoredObject>;
  openReadStream(key: string): ReadStream;
  delete(key: string): Promise<void>;
  absolutePathForKey(key: string): string;
  /** Presigned GET for direct browser download (S3/R2 only). */
  getSignedReadUrl?(key: string, expiresInSeconds?: number): Promise<string>;
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

@Injectable()
export class S3UploadStorage implements UploadStoragePort {
  private readonly logger = new Logger(S3UploadStorage.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    const bucket = config.get<string>('S3_BUCKET')?.trim();
    if (!bucket) {
      throw new ServiceUnavailableException(
        'S3 upload storage requires S3_BUCKET (and S3_REGION, credentials)',
      );
    }
    this.bucket = bucket;
    const region = config.get<string>('S3_REGION', 'ap-south-1');
    const endpoint = config.get<string>('S3_ENDPOINT')?.trim();
    this.client = new S3Client({
      region,
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
      credentials: {
        accessKeyId: config.get<string>('S3_ACCESS_KEY_ID', ''),
        secretAccessKey: config.get<string>('S3_SECRET_ACCESS_KEY', ''),
      },
    });
    this.logger.log(`Upload storage: S3 bucket ${bucket}`);
  }

  async write(key: string, buffer: Buffer): Promise<StoredObject> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key.replace(/\\/g, '/'),
        Body: buffer,
      }),
    );
    return { key };
  }

  openReadStream(key: string): ReadStream {
    const normalized = key.replace(/\\/g, '/');
    const bodyPromise = this.readBody(normalized);
    const stream = Readable.from(
      (async function* () {
        yield await bodyPromise;
      })(),
    );
    return stream as ReadStream;
  }

  private async readBody(key: string): Promise<Buffer> {
    const out = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    if (!out.Body) {
      throw new NotFoundException('Upload file missing in object storage');
    }
    const chunks: Buffer[] = [];
    for await (const chunk of out.Body as AsyncIterable<Buffer>) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key.replace(/\\/g, '/'),
      }),
    );
  }

  absolutePathForKey(key: string): string {
    return key.replace(/\\/g, '/');
  }

  async getSignedReadUrl(key: string, expiresInSeconds = 900): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key.replace(/\\/g, '/'),
      }),
      { expiresIn: expiresInSeconds },
    );
  }
}

export const UPLOAD_STORAGE = 'UPLOAD_STORAGE';

export function uploadStorageFactory(config: ConfigService): UploadStoragePort {
  const mode = (config.get<string>(UPLOAD_STORAGE) ?? 'local').toLowerCase();
  if (mode === 's3' || mode === 'r2') {
    return new S3UploadStorage(config);
  }
  return new LocalUploadStorage(config);
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream, existsSync, mkdirSync, writeFileSync } from 'fs';
import { extname, join, normalize } from 'path';
import { randomUUID } from 'crypto';
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_UPLOAD_BYTES,
} from '../documents/documents.constants';

@Injectable()
export class GovBidDocumentService {
  private readonly uploadRoot: string;

  constructor(config: ConfigService) {
    this.uploadRoot = config.get<string>('UPLOAD_DIR', './uploads');
    if (!existsSync(this.uploadRoot)) {
      mkdirSync(this.uploadRoot, { recursive: true });
    }
  }

  validateFile(file: Express.Multer.File) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('File is required');
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new BadRequestException('File exceeds 5 MB limit');
    }
    if (
      !ALLOWED_UPLOAD_MIME_TYPES.includes(
        file.mimetype as (typeof ALLOWED_UPLOAD_MIME_TYPES)[number],
      )
    ) {
      throw new BadRequestException('Only PDF, JPEG, and PNG uploads are allowed');
    }
  }

  storeForBidder(userId: string, file: Express.Multer.File) {
    this.validateFile(file);
    const ext = extname(file.originalname) || '.pdf';
    const storedRelativePath = join('gov-bids', userId, `${randomUUID()}${ext}`);
    const absolutePath = join(this.uploadRoot, storedRelativePath);
    mkdirSync(join(this.uploadRoot, 'gov-bids', userId), { recursive: true });
    writeFileSync(absolutePath, file.buffer);
    return {
      storedRelativePath,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    };
  }

  assertOwnedBidPath(userId: string, storedRelativePath: string) {
    const expectedPrefix = normalize(join('gov-bids', userId));
    const normalized = normalize(storedRelativePath);
    if (!normalized.startsWith(expectedPrefix)) {
      throw new BadRequestException('Invalid bid document path');
    }
    const absolutePath = normalize(join(this.uploadRoot, normalized));
    if (!absolutePath.startsWith(normalize(this.uploadRoot))) {
      throw new BadRequestException('Invalid bid document path');
    }
    if (!existsSync(absolutePath)) {
      throw new BadRequestException('Bid document not found — upload again');
    }
  }

  openForAdmin(storedRelativePath: string, originalFilename: string, mimeType: string) {
    const normalized = normalize(storedRelativePath);
    if (!normalized.startsWith('gov-bids')) {
      throw new BadRequestException('Invalid bid document path');
    }
    const absolutePath = normalize(join(this.uploadRoot, normalized));
    if (!absolutePath.startsWith(normalize(this.uploadRoot))) {
      throw new BadRequestException('Invalid bid document path');
    }
    if (!existsSync(absolutePath)) {
      throw new NotFoundException('Bid document file missing on storage');
    }
    const stream = createReadStream(absolutePath);
    return new StreamableFile(stream, {
      type: mimeType || 'application/octet-stream',
      disposition: `attachment; filename="${originalFilename || 'bid-document'}"`,
    });
  }
}

import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { extname, join, normalize } from 'path';
import { randomUUID } from 'crypto';
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_UPLOAD_BYTES,
} from '../documents/documents.constants';
import {
  UPLOAD_STORAGE,
  type UploadStoragePort,
} from '../../shared/storage/upload-storage';

@Injectable()
export class GovBidDocumentService {
  constructor(
    @Inject(UPLOAD_STORAGE) private readonly storage: UploadStoragePort,
  ) {}

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

  async storeForBidder(userId: string, file: Express.Multer.File) {
    this.validateFile(file);
    const ext = extname(file.originalname) || '.pdf';
    const storedRelativePath = join('gov-bids', userId, `${randomUUID()}${ext}`);
    await this.storage.write(storedRelativePath, file.buffer);
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
  }

  openForAdmin(storedRelativePath: string, originalFilename: string, mimeType: string) {
    const normalized = normalize(storedRelativePath);
    if (!normalized.startsWith('gov-bids')) {
      throw new BadRequestException('Invalid bid document path');
    }
    try {
      const stream = this.storage.openReadStream(normalized);
      return new StreamableFile(stream, {
        type: mimeType || 'application/octet-stream',
        disposition: `attachment; filename="${originalFilename || 'bid-document'}"`,
      });
    } catch {
      throw new NotFoundException('Bid document file missing on storage');
    }
  }
}

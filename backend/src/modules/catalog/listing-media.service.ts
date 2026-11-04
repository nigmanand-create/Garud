import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../shared/prisma/prisma.service';
import {
  LISTING_IMAGE_MIME_TYPES,
  LISTING_MEDIA_URL_PREFIX,
  MAX_LISTING_IMAGE_BYTES,
} from './listing-media.constants';
import {
  UPLOAD_STORAGE,
  type UploadStoragePort,
} from '../../shared/storage/upload-storage';

@Injectable()
export class ListingMediaService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(UPLOAD_STORAGE) private readonly storage: UploadStoragePort,
  ) {}

  async uploadForPartner(userId: string, file: Express.Multer.File) {
    this.validateFile(file);
    const org = await this.prisma.organization.findUnique({
      where: { ownerId: userId },
    });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const ext = extname(file.originalname) || this.extFromMime(file.mimetype);
    const fileName = `${randomUUID()}${ext}`;
    const storedRelativePath = join('listings', org.id, fileName);
    await this.storage.write(storedRelativePath, file.buffer);

    const url = `${LISTING_MEDIA_URL_PREFIX}/${org.id}/${fileName}`;
    return { url, organizationId: org.id, fileName };
  }

  serveListingImage(orgId: string, fileName: string): StreamableFile {
    const safeName = fileName.replace(/[/\\]/g, '');
    if (!safeName || safeName !== fileName) {
      throw new NotFoundException('Invalid file name');
    }
    const storedRelativePath = join('listings', orgId, safeName);
    const normalizedKey = storedRelativePath.replace(/\\/g, '/');
    if (normalizedKey.includes('..')) {
      throw new NotFoundException('File not found');
    }
    const stream = this.storage.openReadStream(storedRelativePath);
    const mime = this.mimeFromExt(extname(safeName));
    return new StreamableFile(stream, {
      type: mime,
      disposition: 'inline',
    });
  }

  private validateFile(file: Express.Multer.File) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('File is required');
    }
    if (file.size > MAX_LISTING_IMAGE_BYTES) {
      throw new BadRequestException('File exceeds 5MB limit');
    }
    if (
      !LISTING_IMAGE_MIME_TYPES.includes(
        file.mimetype as (typeof LISTING_IMAGE_MIME_TYPES)[number],
      )
    ) {
      throw new BadRequestException('Allowed types: JPEG, PNG');
    }
  }

  private extFromMime(mime: string): string {
    switch (mime) {
      case 'image/jpeg':
        return '.jpg';
      case 'image/png':
        return '.png';
      default:
        return '';
    }
  }

  private mimeFromExt(ext: string): string {
    switch (ext.toLowerCase()) {
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.png':
        return 'image/png';
      default:
        return 'application/octet-stream';
    }
  }
}

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApplicationDocumentType, VerificationStatus } from '@prisma/client';
import {
  createReadStream,
  existsSync,
  mkdirSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../shared/prisma/prisma.service';
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_UPLOAD_BYTES,
} from './documents.constants';

const EDITABLE_DOCUMENT_STATUSES: VerificationStatus[] = [
  VerificationStatus.DRAFT,
  VerificationStatus.REJECTED,
];

@Injectable()
export class DocumentsService {
  private readonly uploadRoot: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.uploadRoot = config.get<string>('UPLOAD_DIR', './uploads');
    this.ensureUploadRoot();
  }

  async uploadForPartner(
    userId: string,
    documentType: ApplicationDocumentType,
    file: Express.Multer.File,
  ) {
    this.validateFile(file);
    const org = await this.prisma.organization.findUnique({
      where: { ownerId: userId },
    });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }
    this.assertCanModifyDocuments(org.verificationStatus);

    const ext = extname(file.originalname) || this.extFromMime(file.mimetype);
    const storedRelativePath = join(
      'organizations',
      org.id,
      `${randomUUID()}${ext}`,
    );
    const absolutePath = join(this.uploadRoot, storedRelativePath);
    mkdirSync(join(this.uploadRoot, 'organizations', org.id), {
      recursive: true,
    });

    writeFileSync(absolutePath, file.buffer);

    return this.prisma.organizationDocument.create({
      data: {
        organizationId: org.id,
        documentType,
        originalFilename: file.originalname,
        storedRelativePath,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        uploadedByUserId: userId,
      },
    });
  }

  async listForPartner(userId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { ownerId: userId },
    });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }
    return this.prisma.organizationDocument.findMany({
      where: { organizationId: org.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteForPartner(userId: string, documentId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { ownerId: userId },
    });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }
    this.assertCanModifyDocuments(org.verificationStatus);

    const doc = await this.prisma.organizationDocument.findFirst({
      where: { id: documentId, organizationId: org.id },
    });
    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    this.removeFileFromDisk(doc.storedRelativePath);
    await this.prisma.organizationDocument.delete({ where: { id: doc.id } });
    return { deleted: true };
  }

  async downloadForPartner(userId: string, documentId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { ownerId: userId },
    });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }
    const doc = await this.prisma.organizationDocument.findFirst({
      where: { id: documentId, organizationId: org.id },
    });
    if (!doc) {
      throw new NotFoundException('Document not found');
    }
    return this.toStreamableFile(doc);
  }

  async listForOrganization(orgId: string) {
    return this.prisma.organizationDocument.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async downloadForAdmin(documentId: string) {
    const doc = await this.prisma.organizationDocument.findUnique({
      where: { id: documentId },
    });
    if (!doc) {
      throw new NotFoundException('Document not found');
    }
    return this.toStreamableFile(doc);
  }

  private toStreamableFile(doc: {
    storedRelativePath: string;
    mimeType: string;
    originalFilename: string;
  }) {
    const absolutePath = join(this.uploadRoot, doc.storedRelativePath);
    if (!existsSync(absolutePath)) {
      throw new NotFoundException('File missing on storage');
    }
    const stream = createReadStream(absolutePath);
    return new StreamableFile(stream, {
      type: doc.mimeType,
      disposition: `attachment; filename="${doc.originalFilename}"`,
    });
  }

  private validateFile(file: Express.Multer.File) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('File is required');
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new BadRequestException('File exceeds 5MB limit');
    }
    if (
      !ALLOWED_UPLOAD_MIME_TYPES.includes(
        file.mimetype as (typeof ALLOWED_UPLOAD_MIME_TYPES)[number],
      )
    ) {
      throw new BadRequestException('Allowed types: PDF, JPEG, PNG');
    }
  }

  private assertCanModifyDocuments(status: VerificationStatus) {
    if (!EDITABLE_DOCUMENT_STATUSES.includes(status)) {
      throw new ForbiddenException(
        'Documents cannot be changed while application is under review or approved',
      );
    }
  }

  private ensureUploadRoot() {
    if (!existsSync(this.uploadRoot)) {
      mkdirSync(this.uploadRoot, { recursive: true });
    }
  }

  private removeFileFromDisk(storedRelativePath: string) {
    const absolutePath = join(this.uploadRoot, storedRelativePath);
    if (existsSync(absolutePath)) {
      unlinkSync(absolutePath);
    }
  }

  private extFromMime(mime: string): string {
    switch (mime) {
      case 'application/pdf':
        return '.pdf';
      case 'image/jpeg':
        return '.jpg';
      case 'image/png':
        return '.png';
      default:
        return '';
    }
  }
}

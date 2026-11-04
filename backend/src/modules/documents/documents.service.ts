import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApplicationDocumentType, VerificationStatus } from '@prisma/client';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../shared/prisma/prisma.service';
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_UPLOAD_BYTES,
} from './documents.constants';
import {
  UPLOAD_STORAGE,
  type UploadStoragePort,
} from '../../shared/storage/upload-storage';

const EDITABLE_DOCUMENT_STATUSES: VerificationStatus[] = [
  VerificationStatus.DRAFT,
  VerificationStatus.REJECTED,
];

export type DocumentDownloadResult =
  | StreamableFile
  | { redirectUrl: string };

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(UPLOAD_STORAGE) private readonly storage: UploadStoragePort,
  ) {}

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
    await this.storage.write(storedRelativePath, file.buffer);

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

    await this.storage.delete(doc.storedRelativePath);
    await this.prisma.organizationDocument.delete({ where: { id: doc.id } });
    return { deleted: true };
  }

  async downloadForPartner(
    userId: string,
    documentId: string,
  ): Promise<DocumentDownloadResult> {
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
    return this.toDownloadResult(doc);
  }

  async listForOrganization(orgId: string) {
    return this.prisma.organizationDocument.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async downloadForAdmin(documentId: string): Promise<DocumentDownloadResult> {
    const doc = await this.prisma.organizationDocument.findUnique({
      where: { id: documentId },
    });
    if (!doc) {
      throw new NotFoundException('Document not found');
    }
    return this.toDownloadResult(doc);
  }

  private async toDownloadResult(doc: {
    storedRelativePath: string;
    mimeType: string;
    originalFilename: string;
  }): Promise<DocumentDownloadResult> {
    if (this.storage.getSignedReadUrl) {
      const redirectUrl = await this.storage.getSignedReadUrl(
        doc.storedRelativePath,
      );
      return { redirectUrl };
    }
    const stream = this.storage.openReadStream(doc.storedRelativePath);
    return new StreamableFile(stream, {
      type: doc.mimeType,
      disposition: `attachment; filename="${doc.originalFilename}"`,
    });
  }

  /** Apply partner/admin download outcome (302 to S3 presigned URL or streamed file). */
  sendDownloadResult(
    res: Response,
    result: DocumentDownloadResult,
  ): StreamableFile | void {
    if ('redirectUrl' in result) {
      res.redirect(302, result.redirectUrl);
      return;
    }
    return result;
  }

  private validateFile(file: Express.Multer.File) {
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

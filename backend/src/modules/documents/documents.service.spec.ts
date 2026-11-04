import { NotFoundException, StreamableFile } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../shared/prisma/prisma.service';
import {
  UPLOAD_STORAGE,
  type UploadStoragePort,
} from '../../shared/storage/upload-storage';
import { DocumentsService } from './documents.service';

describe('DocumentsService download', () => {
  let service: DocumentsService;
  const prismaMock = {
    organization: { findUnique: jest.fn() },
    organizationDocument: { findFirst: jest.fn(), findUnique: jest.fn() },
  };
  let storage: UploadStoragePort;

  beforeEach(async () => {
    storage = {
      write: jest.fn(),
      openReadStream: jest.fn(),
      delete: jest.fn(),
      absolutePathForKey: (k) => k,
    };
    const module = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: UPLOAD_STORAGE, useValue: storage },
      ],
    }).compile();
    service = module.get(DocumentsService);
    jest.resetAllMocks();
  });

  it('returns presigned redirect when storage supports signed reads', async () => {
    storage.getSignedReadUrl = jest
      .fn()
      .mockResolvedValue('https://bucket.example/doc');
    prismaMock.organization.findUnique.mockResolvedValue({ id: 'org-1' });
    prismaMock.organizationDocument.findFirst.mockResolvedValue({
      storedRelativePath: 'organizations/org-1/file.pdf',
      mimeType: 'application/pdf',
      originalFilename: 'gst.pdf',
    });

    const result = await service.downloadForPartner('user-1', 'doc-1');
    expect(result).toEqual({ redirectUrl: 'https://bucket.example/doc' });
    expect(storage.getSignedReadUrl).toHaveBeenCalledWith(
      'organizations/org-1/file.pdf',
    );
  });

  it('streams from disk when signed reads are unavailable', async () => {
    prismaMock.organization.findUnique.mockResolvedValue({ id: 'org-1' });
    prismaMock.organizationDocument.findFirst.mockResolvedValue({
      storedRelativePath: 'organizations/org-1/file.pdf',
      mimeType: 'application/pdf',
      originalFilename: 'gst.pdf',
    });
    (storage.openReadStream as jest.Mock).mockReturnValue('stream');

    const result = await service.downloadForPartner('user-1', 'doc-1');
    expect(result).toBeInstanceOf(StreamableFile);
  });

  it('throws when document is missing', async () => {
    prismaMock.organization.findUnique.mockResolvedValue({ id: 'org-1' });
    prismaMock.organizationDocument.findFirst.mockResolvedValue(null);
    await expect(
      service.downloadForPartner('user-1', 'missing'),
    ).rejects.toThrow(NotFoundException);
  });
});
